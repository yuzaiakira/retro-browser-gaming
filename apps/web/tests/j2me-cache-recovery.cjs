/**
 * Runtime cache corruption → safe offline failure → online repair → relaunch.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-cache-recovery.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { createHash } = require('node:crypto');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');

const root = join(__dirname, '..', 'public');
const evidenceDir = resolveEvidenceDir('PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const assetA = Buffer.from('recovery-asset-a');
  const assetB = Buffer.from('recovery-asset-b');
  const pathA = '/runtime/j2me-recovery-a.bin';
  const pathB = '/runtime/j2me-recovery-b.bin';
  let offline = false;

  const server = createServer(async (req, res) => {
    if (offline) {
      res.writeHead(503);
      res.end('offline');
      return;
    }
    const host = (req.headers.host || '').split(':')[0];
    if (host !== 'j2me.localhost') {
      res.writeHead(421);
      res.end('misdirected');
      return;
    }
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === pathA) {
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(assetA);
      return;
    }
    if (url.pathname === pathB) {
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(assetB);
      return;
    }
    const filePath = normalize(join(root, url.pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    try {
      const body = await readFile(filePath);
      res.writeHead(200, {
        'content-type': types[extname(filePath)] || 'application/octet-stream',
        'cache-control': 'no-store',
        'service-worker-allowed': '/',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('missing');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const origin = `http://j2me.localhost:${port}`;
  const parent = `http://launcher.localhost:${port}`;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--host-resolver-rules=MAP j2me.localhost 127.0.0.1,MAP launcher.localhost 127.0.0.1'],
  });
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${origin}/j2me-install.html?parentOrigin=${encodeURIComponent(parent)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });

  const entries = [
    { url: `${origin}${pathA}`, sha256: sha256(assetA), byteSize: assetA.length, path: pathA },
    { url: `${origin}${pathB}`, sha256: sha256(assetB), byteSize: assetB.length, path: pathB },
  ];

  const precache = (version) =>
    page.evaluate(
      async ({ entries, version }) => {
        const sw = navigator.serviceWorker.controller;
        return new Promise((resolve) => {
          const onMsg = (e) => {
            if (e.data?.type !== 'PRECACHE_DONE') return;
            navigator.serviceWorker.removeEventListener('message', onMsg);
            resolve(e.data);
          };
          navigator.serviceWorker.addEventListener('message', onMsg);
          sw.postMessage({ type: 'PRECACHE', entries, version });
        });
      },
      { entries, version },
    );

  const verify = () =>
    page.evaluate(
      async ({ entries }) => {
        const sw = navigator.serviceWorker.controller;
        return new Promise((resolve) => {
          const onMsg = (e) => {
            if (e.data?.type !== 'VERIFY_ACTIVE_RESULT') return;
            navigator.serviceWorker.removeEventListener('message', onMsg);
            resolve(e.data);
          };
          navigator.serviceWorker.addEventListener('message', onMsg);
          sw.postMessage({ type: 'VERIFY_ACTIVE', entries });
        });
      },
      { entries },
    );

  const install = await precache('recovery-v1');
  if (!install.ok) throw new Error('install failed');

  // Seed RMS on dedicated origin via install bridge IMPORT
  const midletId = 'Retro Browser Gaming/MIT J2ME Dot/1.0.0';
  await page.evaluate(async ({ midletId, parent }) => {
    // Already on install page — post to self via channel by calling IDB directly
    const rms = window.J2meRmsIdb.create();
    await rms.save(midletId, {
      stores: { dotScore: { records: { 1: [0, 0, 0, 42] } } },
    });
    await rms.close();
  }, { midletId, parent });

  // Corrupt one cached asset
  const status = await page.evaluate(async () => {
    const sw = navigator.serviceWorker.controller;
    return new Promise((resolve) => {
      const onMsg = (e) => {
        if (e.data?.type !== 'CACHE_STATUS_RESULT') return;
        navigator.serviceWorker.removeEventListener('message', onMsg);
        resolve(e.data);
      };
      navigator.serviceWorker.addEventListener('message', onMsg);
      sw.postMessage({ type: 'CACHE_STATUS' });
    });
  });
  await page.evaluate(async (activeName) => {
    const cache = await caches.open(activeName);
    const reqs = await cache.keys();
    const target = reqs.find((r) => String(r.url).includes('j2me-recovery-a'));
    if (target) await cache.delete(target);
  }, status.version);

  offline = true;
  const failedVerify = await verify();
  if (failedVerify.ok) throw new Error('offline verify should fail after corruption');

  // Restore connectivity and repair
  offline = false;
  const repair = await precache('recovery-v2');
  if (!repair.ok) throw new Error('repair failed: ' + JSON.stringify(repair));
  const okVerify = await verify();
  if (!okVerify.ok) throw new Error('verify after repair failed');

  // RMS intact
  const rmsAfter = await page.evaluate(async (midletId) => {
    const rms = window.J2meRmsIdb.create();
    const snap = await rms.load(midletId);
    await rms.close();
    return snap;
  }, midletId);
  const score = rmsAfter?.stores?.dotScore?.records?.['1']?.[3];
  if (score !== 42) throw new Error('RMS lost during recovery: ' + score);

  const report = {
    at: new Date().toISOString(),
    origin,
    assertions: {
      installOk: install.ok,
      offlineVerifyFailedSafely: !failedVerify.ok,
      repairOk: repair.ok,
      verifyAfterRepair: okVerify.ok,
      rmsPreserved: score === 42,
    },
  };
  report.passed = Object.values(report.assertions).every(Boolean);
  await writeFile(
    join(evidenceDir, 'j2me-cache-recovery-20261021.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
