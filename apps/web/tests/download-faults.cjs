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
  await page.goto(`${baseUrl}/games/orbit-catch`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Download & try on this device/i }).waitFor({ timeout: 60000 });
  return page;
}

async function trigger(page) {
  await page.getByRole('button', { name: /Download & try on this device/i }).click();
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

function syntheticAsset({ byteSize, version, filename, id, etag }) {
  const chunkSize = 8 * 1024 * 1024;
  return {
    id: id || 'b4a2c856-bbd8-4334-9ae7-38d50c627a46',
    role: 'html_bundle',
    filename: filename || 'synthetic-fixture.bin',
    url: '/dev-assets/b4a2c856-bbd8-4334-9ae7-38d50c627a46/',
    byteSize,
    sha256: syntheticHash(byteSize, chunkSize),
    version,
    etag: etag || version,
    rangeSupported: true,
  };
}

function largeAsset() {
  return syntheticAsset({ byteSize: 100 * 1024 * 1024, version: 'interruption-test-v1', filename: 'interruption-fixture.bin' });
}

function gibAsset() {
  // Precompute once; generating 1 GiB of deterministic bytes for the hash is
  // intentional and finishes in a few seconds, unlike multi-hundred-GiB sizes.
  return syntheticAsset({ byteSize: 1024 * 1024 * 1024, version: 'gib-test-v1', filename: 'gib-fixture.bin' });
}

async function routeLargeManifest(context, asset) {
  await context.unroute('**/api/v1/releases/*/download-manifest/').catch(() => {});
  await context.route('**/api/v1/releases/*/download-manifest/', async (route) => {
    let releaseId = '00000000-0000-4000-8000-000000000000';
    try {
      releaseId = new URL(route.request().url()).pathname.split('/')[4] || releaseId;
    } catch {
      /* keep fallback */
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        manifestVersion: 1,
        releaseId,
        revision: asset.version,
        core: { code: 'native-html', version: 'test' },
        assets: [asset],
        requiredFiles: [asset.filename],
        entryFile: asset.filename,
        offlineRequirements: [],
        requiredCapabilities: [],
      }),
    });
  });
}

async function range(context, handler) {
  await context.unroute('**/dev-assets/b4a2c856-bbd8-4334-9ae7-38d50c627a46/').catch(() => {});
  await context.route('**/dev-assets/b4a2c856-bbd8-4334-9ae7-38d50c627a46/', async (route) => {
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

    // A manifest ETag pins every Range response. A proxy serving a different
    // object under the same asset URL must be stopped before any install.
    {
      const context = await browser.newContext();
      const page = await gamePage(context);
      await page.route('**/dev-assets/**', (route) => route.fulfill({
        status: 206,
        headers: {
          'Content-Range': 'bytes 0-4537/4538',
          'Content-Length': '4538',
          ETag: '"changed-after-manifest"',
        },
        body: Buffer.alloc(4538, 0x5a),
      }));
      await trigger(page);
      await expectFailure(page, 'ETAG_CHANGED', 'recoverable-error');
      console.log('DOWNLOAD_ETAG_CHANGE_REJECT_PASS');
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

    // DL-002: a truncated Range body must not install.
    {
      const context = await browser.newContext();
      const page = await gamePage(context);
      await page.route('**/dev-assets/**', async (route) => {
        const header = route.request().headers().range;
        const match = /^bytes=(\d+)-(\d+)$/.exec(header || '');
        if (!match) throw new Error(`missing Range: ${header}`);
        const start = Number(match[1]);
        const end = Number(match[2]);
        const short = syntheticBytes(start, Math.max(start, end - 64));
        await route.fulfill({
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/4538`,
            'Content-Length': String(short.length),
            ETag: '"3d6cbe289b8f973ad5e1d1e9d6a332dd"',
          },
          body: short,
        });
      });
      await trigger(page);
      await expectFailure(page, 'TRUNCATED_CHUNK', 'recoverable-error');
      console.log('DOWNLOAD_TRUNCATED_CHUNK_REJECT_PASS');
      await context.close();
    }

    // DL-008: bytes flushed to OPFS without a journal commit are overwritten on resume.
    {
      const asset = syntheticAsset({ byteSize: 24 * 1024 * 1024, version: 'crash-journal-v1', filename: 'crash-journal.bin' });
      const context = await browser.newContext();
      await routeLargeManifest(context, asset);
      let blockUnjournaled = true;
      await range(context, async (route, start, end) => {
        if (blockUnjournaled && start >= 8 * 1024 * 1024) return route.abort('connectionreset');
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${asset.byteSize}`, 'Content-Length': String(end - start + 1), ETag: `"${asset.etag}"` },
          body: syntheticBytes(start, end),
        });
      });
      const page = await gamePage(context);
      await trigger(page);
      let beforeResume;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        beforeResume = await downloads(page);
        const current = beforeResume.downloads[0];
        if (current?.bytesVerified === 8 * 1024 * 1024 && current?.state === 'recoverable-error') break;
        beforeResume = undefined;
        await page.waitForTimeout(500);
      }
      if (!beforeResume) throw new Error('download never reached recoverable-error after journaled chunk 0');
      const chunkState = await page.evaluate(async () => {
        const request = indexedDB.open('retro-library');
        return await new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction(['chunks']);
            const chunks = transaction.objectStore('chunks').getAll();
            transaction.oncomplete = () => { const value = chunks.result; database.close(); resolve(value); };
          };
        });
      });
      if (chunkState.length !== 1 || chunkState[0].index !== 0) {
        throw new Error(`expected a single journaled chunk 0 before resume: downloads=${JSON.stringify(beforeResume)} chunks=${JSON.stringify(chunkState)}`);
      }
      blockUnjournaled = false;
      const resumedRanges = [];
      await range(context, async (route, start, end) => {
        resumedRanges.push(start);
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${asset.byteSize}`, 'Content-Length': String(end - start + 1), ETag: `"${asset.etag}"` },
          body: syntheticBytes(start, end),
        });
      });
      await page.goto(`${baseUrl}/games/orbit-catch`, { waitUntil: 'networkidle' });
      await trigger(page);
      await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 120000 });
      const result = await downloads(page);
      if (result.installations.length !== 1 || result.downloads[0]?.state !== 'verified') throw new Error('crash-before-journal recovery did not verify');
      if (!resumedRanges.includes(8 * 1024 * 1024)) throw new Error(`unjournaled chunk was not re-fetched: ${resumedRanges.join(',')}`);
      if (resumedRanges.includes(0)) throw new Error(`journaled chunk 0 was re-fetched after ${JSON.stringify(beforeResume.chunks)} ranges=${resumedRanges.join(',')}`);
      if (resumedRanges.length !== 2) throw new Error(`expected two remaining ranges, got ${resumedRanges.join(',')}`);
      console.log('DOWNLOAD_CRASH_BEFORE_JOURNAL_RECOVERY_PASS');
      await context.close();
    }

    // DL-009: a changed asset version/identity must not silently reuse old chunks.
    {
      const original = syntheticAsset({ byteSize: 16 * 1024 * 1024, version: 'identity-v1', filename: 'identity.bin' });
      const changed = syntheticAsset({
        byteSize: 16 * 1024 * 1024,
        version: 'identity-v2',
        filename: 'identity.bin',
        id: 'c5b3d967-cce9-5445-8bf8-49e61d738b57',
      });
      const context = await browser.newContext();
      await routeLargeManifest(context, original);
      let pauseAfterFirst = true;
      let firstDone;
      const firstChunkDone = new Promise((resolve) => { firstDone = resolve; });
      await range(context, async (route, start, end) => {
        if (start === 0) firstDone();
        if (pauseAfterFirst && start > 0) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${original.byteSize}`, 'Content-Length': String(end - start + 1), ETag: `"${original.etag}"` },
          body: syntheticBytes(start, end),
        });
      });
      const page = await gamePage(context);
      await trigger(page);
      await firstChunkDone;
      await page.goto(`${baseUrl}/downloads`);
      await page.getByRole('button', { name: 'Pause' }).click();
      pauseAfterFirst = false;
      await page.waitForFunction(async () => {
        const request = indexedDB.open('retro-library');
        return await new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction(['downloads']);
            const download = transaction.objectStore('downloads').getAll();
            transaction.oncomplete = () => {
              const value = download.result[0];
              database.close();
              resolve(value?.state === 'paused' && value?.bytesVerified >= 8 * 1024 * 1024);
            };
          };
        });
      }, undefined, { timeout: 30000 });

      await routeLargeManifest(context, changed);
      const changedRanges = [];
      await range(context, async (route, start, end) => {
        changedRanges.push(start);
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${changed.byteSize}`, 'Content-Length': String(end - start + 1), ETag: `"${changed.etag}"` },
          body: syntheticBytes(start, end),
        });
      });
      await page.goto(`${baseUrl}/games/orbit-catch`);
      await trigger(page);
      await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 120000 });
      const result = await downloads(page);
      const verified = result.downloads.filter((item) => item.state === 'verified');
      if (!verified.some((item) => item.asset.version === 'identity-v2')) throw new Error('changed identity did not install the new version');
      if (!changedRanges.includes(0)) throw new Error('new identity reused old chunk offsets without refetching from start');
      console.log('DOWNLOAD_CHANGED_IDENTITY_NO_SILENT_REUSE_PASS');
      await context.close();
    }

    // DL-011: quota check must fail closed before writing when free space is insufficient.
    {
      const context = await browser.newContext();
      // Do not hash 512 GiB of synthetic bytes in Node — the worker must reject
      // during checking-space before any Range request.
      const huge = {
        id: 'b4a2c856-bbd8-4334-9ae7-38d50c627a46',
        role: 'html_bundle',
        filename: 'quota.bin',
        url: '/dev-assets/b4a2c856-bbd8-4334-9ae7-38d50c627a46/',
        byteSize: 512 * 1024 * 1024 * 1024,
        sha256: 'a'.repeat(64),
        version: 'quota-v1',
        etag: 'quota-v1',
        rangeSupported: true,
      };
      await routeLargeManifest(context, huge);
      let ranged = 0;
      await range(context, async (route, start, end) => {
        ranged += 1;
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${huge.byteSize}`, 'Content-Length': String(end - start + 1), ETag: '"quota-v1"' },
          body: Buffer.alloc(1),
        });
      });
      const page = await gamePage(context);
      // Compatibility probe disables the button before the worker runs; force the
      // install path so the dedicated worker's QUOTA_INSUFFICIENT gate is exercised.
      await page.locator('button', { hasText: /Download & try on this device/i }).evaluate((button) => {
        button.disabled = false;
      });
      await trigger(page);
      await expectFailure(page, 'QUOTA_INSUFFICIENT', 'recoverable-error');
      if (ranged !== 0) throw new Error('quota failure still issued Range requests');
      console.log('DOWNLOAD_QUOTA_INSUFFICIENT_PASS');
      await context.close();
    }

    // DL-012: pause then cancel/delete removes journal and OPFS bytes without an install.
    {
      const asset = syntheticAsset({ byteSize: 32 * 1024 * 1024, version: 'cancel-v1', filename: 'cancel.bin' });
      const context = await browser.newContext();
      await routeLargeManifest(context, asset);
      let releaseHold;
      const held = new Promise((resolve) => { releaseHold = resolve; });
      let requests = 0;
      await range(context, async (route, start, end) => {
        requests += 1;
        if (requests === 1) {
          releaseHold();
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${asset.byteSize}`, 'Content-Length': String(end - start + 1), ETag: `"${asset.etag}"` },
          body: syntheticBytes(start, end),
        });
      });
      const page = await gamePage(context);
      await trigger(page);
      await held;
      await page.goto(`${baseUrl}/downloads`);
      await page.getByRole('button', { name: 'Pause' }).click();
      await page.getByRole('button', { name: 'Cancel & delete' }).click();
      await page.waitForFunction(async () => {
        const request = indexedDB.open('retro-library');
        return await new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction(['downloads', 'installations', 'chunks']);
            const downloadsRequest = transaction.objectStore('downloads').getAll();
            const installationsRequest = transaction.objectStore('installations').getAll();
            const chunksRequest = transaction.objectStore('chunks').getAll();
            transaction.oncomplete = () => {
              const value = {
                downloads: downloadsRequest.result,
                installations: installationsRequest.result,
                chunks: chunksRequest.result,
              };
              database.close();
              resolve(value.downloads.length === 0 && value.installations.length === 0 && value.chunks.length === 0);
            };
          };
        });
      }, undefined, { timeout: 30000 });
      const opfsGone = await page.evaluate(async ({ assetId, version, sha256 }) => {
        const key = `${assetId}-${version}-${sha256}`;
        try {
          const root = await navigator.storage.getDirectory();
          const games = await root.getDirectoryHandle('games');
          await games.getDirectoryHandle(key);
          return false;
        } catch {
          return true;
        }
      }, { assetId: asset.id, version: asset.version, sha256: asset.sha256 });
      if (!opfsGone) throw new Error('cancel/delete left OPFS bytes behind');
      console.log('DOWNLOAD_CANCEL_DELETE_PASS');
      await context.close();
    }

    // DL-013: 1 GiB synthetic Range download with bounded JS heap and matching SHA-256.
    {
      const asset = gibAsset();
      const context = await browser.newContext();
      await routeLargeManifest(context, asset);
      const page = await gamePage(context);
      const client = await context.newCDPSession(page);
      await client.send('HeapProfiler.enable');
      const samples = [];
      const sample = async () => {
        const heap = await client.send('Runtime.getHeapUsage');
        samples.push(heap.usedSize);
      };
      await sample();
      await range(context, async (route, start, end) => {
        await route.fulfill({
          status: 206,
          headers: { 'Content-Range': `bytes ${start}-${end}/${asset.byteSize}`, 'Content-Length': String(end - start + 1), ETag: `"${asset.etag}"` },
          body: syntheticBytes(start, end),
        });
      });
      await trigger(page);
      const sampler = setInterval(() => { sample().catch(() => {}); }, 1000);
      try {
        await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 600000 });
      } finally {
        clearInterval(sampler);
      }
      await sample();
      const result = await downloads(page);
      if (result.installations.length !== 1 || result.downloads[0]?.state !== 'verified') throw new Error('1 GiB download did not verify');
      if (result.downloads[0]?.bytesVerified !== asset.byteSize) throw new Error('1 GiB bytesVerified mismatch');
      const peak = Math.max(...samples);
      const baseline = samples[0] || 0;
      const growth = peak - baseline;
      // Worker uses ≤8 MiB range buffers plus a 1 MiB hash window. Allow generous
      // headroom for UI/runtime, but never approach the 1 GiB payload size.
      if (growth > 256 * 1024 * 1024) throw new Error(`1 GiB download JS heap grew too much: ${growth} bytes (peak ${peak}, baseline ${baseline})`);
      console.log(`DOWNLOAD_1GIB_BOUNDED_MEMORY_PASS growth=${growth} peak=${peak} baseline=${baseline}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
