const { chromium } = require('@playwright/test');
const { createHash } = require('node:crypto');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

async function downloads(page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('retro-library');
    return await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(['downloads', 'installations']);
        const downloadRequest = transaction.objectStore('downloads').getAll();
        const installRequest = transaction.objectStore('installations').getAll();
        transaction.oncomplete = () => { const value = { downloads: downloadRequest.result, installations: installRequest.result }; database.close(); resolve(value); };
      };
    });
  });
}

async function gamePage(context) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('button', { name: 'Download & try on this device' }).waitFor();
  return page;
}

async function trigger(page) {
  await page.getByRole('button', { name: 'Download & try on this device' }).click();
}

async function expectFailure(page, error, state) {
  await page.waitForFunction(async ({ expectedError, expectedState }) => {
    const request = indexedDB.open('retro-library');
    const current = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(['downloads', 'installations']);
        const download = transaction.objectStore('downloads').getAll();
        const installations = transaction.objectStore('installations').getAll();
        transaction.oncomplete = () => { const value = { download: download.result[0], installations: installations.result }; database.close(); resolve(value); };
      };
    });
    return current.installations.length === 0 && current.download?.state === expectedState && String(current.download.error || '').includes(expectedError);
  }, { expectedError: error, expectedState: state }, { timeout: 30000 });
}

function syntheticBytes(start, end) {
  const body = Buffer.allocUnsafe(end - start + 1);
  for (let index = 0; index < body.length; index += 1) body[index] = (start + index) % 251;
  return body;
}

function syntheticHash(byteSize, chunkSize) {
  const hash = createHash('sha256');
  for (let start = 0; start < byteSize; start += chunkSize) {
    hash.update(syntheticBytes(start, Math.min(byteSize - 1, start + chunkSize - 1)));
  }
  return hash.digest('hex');
}

function largeAsset() {
  const byteSize = 100 * 1024 * 1024;
  const chunkSize = 8 * 1024 * 1024;
  return {
    id: 'b4a2c856-bbd8-4334-9ae7-38d50c627a46',
    role: 'html_bundle',
    filename: 'interruption-fixture.bin',
    url: '/dev-assets/b4a2c856-bbd8-4334-9ae7-38d50c627a46/',
    byteSize,
    sha256: syntheticHash(byteSize, chunkSize),
    version: 'interruption-test-v1',
    etag: 'interruption-test-v1',
    rangeSupported: true,
  };
}

async function routeLargeManifest(context, asset) {
  await context.route('**/api/v1/releases/*/download-manifest/', async (route) => {
    const upstream = await route.fetch();
    const manifest = await upstream.json();
    manifest.assets = [asset];
    manifest.entryFile = asset.filename;
    manifest.requiredFiles = [asset.filename];
    await route.fulfill({ response: upstream, json: manifest });
  });
}

function range(context, handler) {
  return context.route('**/dev-assets/b4a2c856-bbd8-4334-9ae7-38d50c627a46/', async (route) => {
    const header = route.request().headers().range;
    const match = /^bytes=(\d+)-(\d+)$/.exec(header || '');
    if (!match) throw new Error(`missing synthetic fixture Range header: ${header}`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    await handler(route, start, end);
  });
}

async function run() {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    // A transient transport failure must retry and produce a verified install.
    {
      const context = await browser.newContext();
      const page = await gamePage(context);
      let failures = 0;
      await page.route('**/dev-assets/**', async (route) => {
        if (failures++ === 0) await route.abort('connectionreset');
        else await route.continue();
      });
      await trigger(page);
      await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 15000 });
      const result = await downloads(page);
      if (result.installations.length !== 1 || result.downloads[0]?.state !== 'verified' || failures < 2) throw new Error('network retry did not produce a verified installation');
      console.log('DOWNLOAD_RETRY_PASS');
      await context.close();
    }

    // The worker requires a strict Range response. A proxy/server regression
    // returning 200 must remain recoverable and must never install the asset.
    {
      const context = await browser.newContext();
      const page = await gamePage(context);
      await page.route('**/dev-assets/**', (route) => route.fulfill({ status: 200, body: 'not a range response' }));
      await trigger(page);
      await expectFailure(page, 'RANGE_200', 'recoverable-error');
      console.log('DOWNLOAD_HTTP_200_REJECT_PASS');
      await context.close();
    }

    {
      const context = await browser.newContext();
      const page = await gamePage(context);
      await page.route('**/dev-assets/**', (route) => route.fulfill({ status: 416, headers: { 'Content-Range': 'bytes */4538' } }));
      await trigger(page);
      await expectFailure(page, 'RANGE_416', 'recoverable-error');
      console.log('DOWNLOAD_HTTP_416_REJECT_PASS');
      await context.close();
    }

    // A syntactically valid 206 with altered bytes reaches OPFS and then fails
    // the final streaming SHA-256 verification. It must remain non-installed.
    {
      const context = await browser.newContext();
      const page = await gamePage(context);
      await page.route('**/dev-assets/**', (route) => route.fulfill({
        status: 206,
        headers: {
          'Content-Range': 'bytes 0-4537/4538',
          'Content-Length': '4538',
          ETag: '"3d6cbe289b8f973ad5e1d1e9d6a332dd"',
        },
        body: Buffer.alloc(4538, 0x5a),
      }));
      await trigger(page);
      await expectFailure(page, 'SHA256_MISMATCH', 'fatal-error');
      console.log('DOWNLOAD_SHA256_REJECT_PASS');
      await context.close();
    }

    // Two tabs share the same origin lock. Hold the first Range long enough
    // to make the second worker contend for that real Web Lock.
    {
      const context = await browser.newContext();
      const first = await gamePage(context);
      const second = await gamePage(context);
      let releaseFirstRequest;
      const firstRequest = new Promise((resolve) => { releaseFirstRequest = resolve; });
      let requests = 0;
      await context.route('**/dev-assets/**', async (route) => {
        if (requests++ === 0) {
          releaseFirstRequest();
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
        await route.continue();
      });
      await trigger(first);
      await firstRequest;
      const lockState = await first.evaluate(() => navigator.locks.query());
      if (!lockState.held.some((lock) => lock.name.startsWith('asset:'))) throw new Error('first tab did not hold the asset lock');
      await trigger(second);
      await second.getByText('DOWNLOAD_BUSY_OTHER_TAB', { exact: false }).waitFor({ timeout: 5000 });
      await Promise.race([
        first.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 15000 }),
        second.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 15000 }),
      ]);
      const result = await downloads(first);
      if (result.installations.length !== 1 || result.downloads.length !== 1 || result.downloads[0].state !== 'verified') throw new Error('two-tab download produced an invalid installation state');
      console.log('DOWNLOAD_TWO_TAB_LOCK_PASS');
      await context.close();
    }

    // This is an actual 100 MiB download through the browser worker. It sees
    // a reset on its second range, persists the successful retry, then the
    // browser process is terminated while requesting the third chunk. A fresh
    // process must rehash those two OPFS chunks and fetch only the tail.
    {
      const asset = largeAsset();
      const profile = await mkdtemp(join(tmpdir(), 'retro-download-restart-'));
      let firstContext;
      try {
        firstContext = await chromium.launchPersistentContext(profile, { executablePath, headless: true, args: ['--no-sandbox'] });
        await routeLargeManifest(firstContext, asset);
        let requests = 0;
        let thirdRequest;
        const thirdRequested = new Promise((resolve) => { thirdRequest = resolve; });
        await range(firstContext, async (route, start, end) => {
          requests += 1;
          if (requests === 2) return route.abort('connectionreset');
          if (requests === 4) thirdRequest();
          await route.fulfill({
            status: 206,
            headers: { 'Content-Range': `bytes ${start}-${end}/${asset.byteSize}`, 'Content-Length': String(end - start + 1), ETag: '"interruption-test-v1"' },
            body: syntheticBytes(start, end),
          });
        });
        const first = await gamePage(firstContext);
        await trigger(first);
        await thirdRequested;
        const beforeRestart = await downloads(first);
        if (beforeRestart.downloads[0]?.bytesVerified !== 16 * 1024 * 1024) throw new Error('successful retried chunks were not journaled before browser termination');
        await firstContext.close();
        firstContext = undefined;

        const resumed = await chromium.launchPersistentContext(profile, { executablePath, headless: true, args: ['--no-sandbox'] });
        try {
          await routeLargeManifest(resumed, asset);
          const resumedRanges = [];
          await range(resumed, async (route, start, end) => {
            resumedRanges.push(start);
            await route.fulfill({
              status: 206,
              headers: { 'Content-Range': `bytes ${start}-${end}/${asset.byteSize}`, 'Content-Length': String(end - start + 1), ETag: '"interruption-test-v1"' },
              body: syntheticBytes(start, end),
            });
          });
          const page = await resumed.newPage();
          await page.goto(`${baseUrl}/downloads`);
          await page.getByRole('button', { name: 'Resume / retry' }).click();
          await page.getByText('Ready offline. Your game is stored on this device.').waitFor({ timeout: 120000 });
          const result = await downloads(page);
          if (result.installations.length !== 1 || result.downloads[0]?.state !== 'verified') throw new Error('100 MiB recovery did not produce a verified installation');
          if (resumedRanges.length !== 11 || resumedRanges.some((start) => start < 16 * 1024 * 1024)) throw new Error(`browser restart re-fetched journaled bytes: ${resumedRanges.join(',')}`);
          console.log('DOWNLOAD_100M_INTERRUPTION_AND_BROWSER_RESTART_PASS');
        } finally {
          await resumed.close();
        }
      } finally {
        if (firstContext) await firstContext.close();
        await rm(profile, { recursive: true, force: true });
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
