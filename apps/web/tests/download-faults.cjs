const { chromium } = require('@playwright/test');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

async function downloads(page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('retro-library');
    return await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction(['downloads', 'installations']);
        const downloadRequest = transaction.objectStore('downloads').getAll();
        const installRequest = transaction.objectStore('installations').getAll();
        transaction.oncomplete = () => resolve({ downloads: downloadRequest.result, installations: installRequest.result });
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
  await page.getByText(error, { exact: false }).waitFor({ timeout: 15000 });
  const result = await downloads(page);
  if (result.installations.length) throw new Error(`${error} marked a damaged download installed`);
  if (result.downloads.length !== 1 || result.downloads[0].state !== state) throw new Error(`${error} recorded unexpected download state`);
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
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
