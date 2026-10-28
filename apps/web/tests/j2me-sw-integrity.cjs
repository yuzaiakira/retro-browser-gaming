/**
 * Atomic J2ME service-worker install + SHA-256 integrity gates.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-sw-integrity.cjs
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
  const assetA = Buffer.from('j2me-runtime-asset-a-v1');
  const assetB = Buffer.from('j2me-runtime-asset-b-v1');
  const corrupt = Buffer.from('CORRUPTED');
  const fixtureAPath = '/runtime/j2me-fixture-a.bin';
  const fixtureBPath = '/runtime/j2me-fixture-b.bin';

  const server = createServer(async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    if (host !== 'j2me.localhost' && host !== 'launcher.localhost') {
      res.writeHead(421);
      res.end('misdirected');
      return;
    }
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === fixtureAPath) {
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(assetA);
      return;
    }
    if (url.pathname === fixtureBPath) {
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(assetB);
      return;
    }
    if (url.pathname === '/evil/not-allowed.bin') {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(Buffer.from('evil'));
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

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const origin = `http://j2me.localhost:${port}`;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--host-resolver-rules=MAP j2me.localhost 127.0.0.1,MAP launcher.localhost 127.0.0.1'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    okShaPromote: false,
    badShaRejected: false,
    priorCachePreserved: false,
    pathRejected: false,
    verifyDetectsCorruption: false,
    noAutoSkipWaiting: false,
  };

  const parent = `http://launcher.localhost:${port}`;
  await page.goto(`${origin}/j2me-install.html?parentOrigin=${encodeURIComponent(parent)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });

  const goodEntries = [
    {
      url: `${origin}${fixtureAPath}`,
      sha256: sha256(assetA),
      byteSize: assetA.length,
      path: fixtureAPath,
    },
    {
      url: `${origin}${fixtureBPath}`,
      sha256: sha256(assetB),
      byteSize: assetB.length,
      path: fixtureBPath,
    },
  ];

  async function precache(entries, version) {
    return page.evaluate(
      async ({ entries, version }) => {
        const sw = navigator.serviceWorker.controller;
        if (!sw) throw new Error('no controller');
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
  }

  async function status() {
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

  async function verify(entries) {
    return page.evaluate(
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
  }

  const good = await precache(goodEntries, 'swtest-v1');
  if (!good.ok) throw new Error('good precache failed: ' + JSON.stringify(good));
  results.okShaPromote = true;
  const afterGood = await status();
  if (!afterGood.ready || afterGood.count < 2) throw new Error('active not ready');

  const badEntries = [
    { ...goodEntries[0] },
    { ...goodEntries[1], sha256: sha256(corrupt) },
  ];
  const bad = await precache(badEntries, 'swtest-v2-bad');
  if (bad.ok) throw new Error('bad SHA should fail');
  results.badShaRejected = true;
  const afterBad = await status();
  if (afterBad.version !== afterGood.version) {
    throw new Error('active cache replaced after failed install');
  }
  results.priorCachePreserved = true;

  const evil = await precache(
    [
      {
        url: `${origin}/evil/not-allowed.bin`,
        sha256: sha256(Buffer.from('evil')),
        byteSize: 4,
        path: '/evil/not-allowed.bin',
      },
    ],
    'swtest-evil',
  );
  if (evil.ok) throw new Error('evil path should fail');
  if (!(evil.results || []).some((r) => r.error === 'PATH_NOT_ALLOWED')) {
    throw new Error('expected PATH_NOT_ALLOWED got ' + JSON.stringify(evil));
  }
  results.pathRejected = true;

  const deleted = await page.evaluate(async (activeName) => {
    const cache = await caches.open(activeName);
    const reqs = await cache.keys();
    const target = reqs.find((r) => String(r.url).includes('j2me-fixture-a'));
    if (!target) return { ok: false, reason: 'target-missing', keys: reqs.map((r) => r.url) };
    await cache.delete(target);
    return { ok: true, deleted: target.url };
  }, afterGood.version);
  if (!deleted.ok) throw new Error('could not corrupt cache: ' + JSON.stringify(deleted));
  const verified = await verify(goodEntries);
  if (verified.ok) throw new Error('verify should fail after corruption');
  results.verifyDetectsCorruption = true;

  const waitingBehavior = await page.evaluate(async () => {
    const src = await (await fetch('/j2me-sw.js', { cache: 'no-store' })).text();
    return {
      hasSkipOnInstall: /addEventListener\(\s*['"]install['"][\s\S]{0,200}?skipWaiting/.test(src),
      mentionsActivateUpdate: src.includes('ACTIVATE_UPDATE'),
    };
  });
  results.noAutoSkipWaiting =
    !waitingBehavior.hasSkipOnInstall && waitingBehavior.mentionsActivateUpdate;

  const report = {
    at: new Date().toISOString(),
    origin,
    results,
    passed: Object.values(results).every(Boolean),
  };
  await writeFile(
    join(evidenceDir, 'j2me-sw-integrity-20261021.json'),
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
