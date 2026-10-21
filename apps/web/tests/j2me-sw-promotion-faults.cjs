/**
 * Fault-injection for J2ME SW cache promotion + ACTIVATE_UPDATE authorization.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-sw-promotion-faults.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { createHash } = require('node:crypto');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');

const root = join(__dirname, '..', 'public');
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-06');
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
  const assetA = Buffer.from('promo-asset-a');
  const assetB = Buffer.from('promo-asset-b');
  const pathA = '/runtime/j2me-promo-a.bin';
  const pathB = '/runtime/j2me-promo-b.bin';

  const server = createServer(async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    if (host !== 'j2me.localhost' && host !== 'launcher.localhost') {
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
    if (url.pathname === '/runtime/j2me-frame-spoof.html') {
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
      res.end(`<!doctype html><title>spoof</title>
<script>
window.tryActivate = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const target = reg.waiting || reg.active;
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timedOut: true }), 3000);
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'ACTIVATE_DENIED' || e.data?.type === 'ACTIVATE_ACCEPTED') {
        clearTimeout(t);
        resolve(e.data);
      }
    });
    target.postMessage({ type: 'ACTIVATE_UPDATE' });
  });
};
</script>`);
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
  const context = await browser.newContext();
  const install = await context.newPage();
  await install.goto(`${origin}/j2me-install.html?parentOrigin=${encodeURIComponent(parent)}`, {
    waitUntil: 'domcontentloaded',
  });
  await install.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });

  const entries = [
    { url: `${origin}${pathA}`, sha256: sha256(assetA), byteSize: assetA.length, path: pathA },
    { url: `${origin}${pathB}`, sha256: sha256(assetB), byteSize: assetB.length, path: pathB },
  ];

  async function precache(page, version, fault) {
    return page.evaluate(
      async ({ entries, version, fault }) => {
        const sw = navigator.serviceWorker.controller;
        return new Promise((resolve) => {
          const onMsg = (e) => {
            if (e.data?.type !== 'PRECACHE_DONE') return;
            navigator.serviceWorker.removeEventListener('message', onMsg);
            resolve(e.data);
          };
          navigator.serviceWorker.addEventListener('message', onMsg);
          sw.postMessage({ type: 'PRECACHE', entries, version, fault: fault || null });
        });
      },
      { entries, version, fault: fault || null },
    );
  }

  async function status(page) {
    return page.evaluate(async () => {
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
  }

  const results = {
    firstPromoteOk: false,
    uniqueGenerationName: false,
    reinstallKeepsPriorUntilCommit: false,
    crashBeforeReadyPreservesActive: false,
    crashBeforeMetaPreservesActive: false,
    quotaDuringCopyPreservesActive: false,
    activateDeniedFromRuntimeFrame: false,
    activateAcceptedFromInstall: false,
  };

  const first = await precache(install, 'promo-v1', null);
  if (!first.ok) throw new Error('first promote failed: ' + JSON.stringify(first));
  results.firstPromoteOk = true;
  const afterFirst = await status(install);
  results.uniqueGenerationName = String(afterFirst.version || '').includes('j2me-runtime-gen-');
  const knownGood = afterFirst.version;

  // Same manifest version again → new generation name; prior remains until pointer moves.
  const second = await precache(install, 'promo-v1', null);
  if (!second.ok) throw new Error('second promote failed');
  results.reinstallKeepsPriorUntilCommit =
    second.previous === knownGood && second.version !== knownGood;
  const afterSecond = await status(install);
  if (afterSecond.version === knownGood) {
    throw new Error('pointer did not advance to new generation');
  }

  const activeBeforeFault = afterSecond.version;

  const crashReady = await precache(install, 'promo-v2', 'crash-before-ready');
  if (crashReady.ok) throw new Error('crash-before-ready should fail');
  const afterCrashReady = await status(install);
  results.crashBeforeReadyPreservesActive = afterCrashReady.version === activeBeforeFault;

  const crashMeta = await precache(install, 'promo-v3', 'crash-before-meta');
  if (crashMeta.ok) throw new Error('crash-before-meta should fail');
  const afterCrashMeta = await status(install);
  results.crashBeforeMetaPreservesActive = afterCrashMeta.version === activeBeforeFault;

  const quota = await precache(install, 'promo-v4', 'quota-during-copy');
  if (quota.ok) throw new Error('quota fault should fail');
  if (quota.error !== 'QuotaExceededError') {
    throw new Error('expected QuotaExceededError got ' + quota.error);
  }
  const afterQuota = await status(install);
  results.quotaDuringCopyPreservesActive = afterQuota.version === activeBeforeFault;

  // Negative: runtime-like page cannot ACTIVATE_UPDATE
  const spoof = await context.newPage();
  await spoof.goto(`${origin}/runtime/j2me-frame-spoof.html`, { waitUntil: 'domcontentloaded' });
  // Ensure this client is controlled
  await spoof.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  const denied = await spoof.evaluate(() => window.tryActivate());
  results.activateDeniedFromRuntimeFrame =
    denied?.type === 'ACTIVATE_DENIED' && denied.error === 'CLIENT_NOT_INSTALL_SURFACE';

  // Positive: install surface can activate (message accepted — may already be controlling)
  const accepted = await install.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const target = reg.waiting || reg.active;
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve({ timedOut: true }), 5000);
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'ACTIVATE_DENIED' || e.data?.type === 'ACTIVATE_ACCEPTED') {
          clearTimeout(t);
          resolve(e.data);
        }
      });
      target.postMessage({ type: 'ACTIVATE_UPDATE' });
    });
  });
  results.activateAcceptedFromInstall = accepted?.type === 'ACTIVATE_ACCEPTED';

  const report = {
    at: new Date().toISOString(),
    origin,
    knownGood,
    activeAfterFaults: afterQuota.version,
    results,
    notes: {
      promotion: 'Unique generation names; pointer switch after ready marker; faults do not clear active',
      activate: 'ACTIVATE_UPDATE authorized only for /j2me-install.html clients',
      atomicityClaim:
        'Not a single CacheStorage transaction; safety is generation+pointer ordering',
    },
  };
  report.passed = Object.values(results).every(Boolean);
  await writeFile(
    join(evidenceDir, 'j2me-sw-promotion-faults-20261021.json'),
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
