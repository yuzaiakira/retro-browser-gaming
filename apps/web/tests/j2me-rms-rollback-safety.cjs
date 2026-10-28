/**
 * RMS rollback safety: deliberately different source/target versions.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-rms-rollback-safety.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');

const root = join(__dirname, '..', 'public');
const evidenceDir = resolveEvidenceDir('PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const DOT = 'Retro Browser Gaming/MIT J2ME Dot/1.0.0';

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

function launcherHtml(j2meOrigin) {
  return `<!doctype html><title>launcher</title>
<iframe id="bridge" sandbox="allow-scripts allow-same-origin"></iframe>
<script>
const J2ME = ${JSON.stringify(j2meOrigin)};
window.bootBridge = () => {
  const iframe = document.getElementById('bridge');
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('boot timeout')), 30000);
    addEventListener('message', function onMsg(e) {
      if (e.origin !== J2ME || e.data?.channel !== 'j2me-install') return;
      if (e.data.type === 'boot') { clearTimeout(t); removeEventListener('message', onMsg); resolve(e.data); }
      if (e.data.type === 'error') { clearTimeout(t); reject(new Error(e.data.error)); }
    });
    iframe.src = J2ME + '/j2me-install.html?parentOrigin=' + encodeURIComponent(location.origin);
  });
};
window.exportRms = () => new Promise((resolve, reject) => {
  const iframe = document.getElementById('bridge');
  const t = setTimeout(() => reject(new Error('export timeout')), 20000);
  const onMsg = (e) => {
    if (e.origin !== J2ME || e.data?.channel !== 'j2me-install') return;
    if (e.data.type === 'rms-export') { clearTimeout(t); removeEventListener('message', onMsg); resolve(e.data); }
    if (e.data.type === 'error') { clearTimeout(t); reject(new Error(e.data.error)); }
  };
  addEventListener('message', onMsg);
  iframe.contentWindow.postMessage({ channel: 'j2me-install', type: 'EXPORT_RMS' }, J2ME);
});
window.importRms = (suites) => new Promise((resolve, reject) => {
  const iframe = document.getElementById('bridge');
  const t = setTimeout(() => reject(new Error('import timeout')), 20000);
  const onMsg = (e) => {
    if (e.origin !== J2ME || e.data?.channel !== 'j2me-install') return;
    if (e.data.type === 'rms-import') { clearTimeout(t); removeEventListener('message', onMsg); resolve(e.data); }
    if (e.data.type === 'error') { clearTimeout(t); reject(new Error(e.data.error)); }
  };
  addEventListener('message', onMsg);
  iframe.contentWindow.postMessage({ channel: 'j2me-install', type: 'IMPORT_RMS', suites }, J2ME);
});
window.putLauncher = async (id, snap) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('retro-j2me-rms', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('midlets');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction('midlets', 'readwrite');
    tx.objectStore('midlets').put(snap, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
};
window.getLauncher = async (id) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('retro-j2me-rms', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('midlets');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const v = await new Promise((res, rej) => {
    const tx = db.transaction('midlets', 'readonly');
    const req = tx.objectStore('midlets').get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
  db.close();
  return v;
};
</script>`;
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  let port = 0;
  let j2meOrigin = '';

  const server = createServer(async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    if (host !== 'j2me.localhost' && host !== 'launcher.localhost') {
      res.writeHead(421);
      res.end('misdirected');
      return;
    }
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (host === 'launcher.localhost' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(launcherHtml(j2meOrigin));
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
  port = server.address().port;
  j2meOrigin = `http://j2me.localhost:${port}`;
  const launcherOrigin = `http://launcher.localhost:${port}`;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--host-resolver-rules=MAP j2me.localhost 127.0.0.1,MAP launcher.localhost 127.0.0.1'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(launcherOrigin + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.bootBridge());

  const dedicatedNewer = {
    stores: { dotScore: { records: { 1: [0, 0, 0, 9] } } },
    meta: { updatedAt: 9000, revision: 5 },
  };
  const launcherStale = {
    stores: { dotScore: { records: { 1: [0, 0, 0, 2] } } },
    meta: { updatedAt: 100, revision: 1 },
  };
  await page.evaluate(
    ({ id, snap }) => window.putLauncher(id, snap),
    { id: DOT, snap: launcherStale },
  );

  const imp1 = await page.evaluate(
    ({ id, snap }) => window.importRms([{ midletId: id, snapshot: snap }]),
    { id: DOT, snap: dedicatedNewer },
  );
  if (!imp1.results?.some((r) => r.decision === 'import-source')) {
    throw new Error('failed to seed dedicated: ' + JSON.stringify(imp1));
  }

  const imp2 = await page.evaluate(
    ({ id, snap }) => window.importRms([{ midletId: id, snapshot: snap }]),
    { id: DOT, snap: launcherStale },
  );
  const keep = imp2.results?.find((r) => r.midletId === DOT);
  if (keep?.decision !== 'keep-target') {
    throw new Error('stale launcher overwrote dedicated: ' + JSON.stringify(imp2));
  }

  const exported = await page.evaluate(() => window.exportRms());
  const suite = exported.suites.find((s) => s.midletId === DOT);
  const score = suite?.snapshot?.stores?.dotScore?.records?.['1']?.[3];
  if (score !== 9) throw new Error('dedicated score lost: ' + score);

  const mergeResult = await page.evaluate(
    async ({ id, dedicated }) => {
      const existing = await window.getLauncher(id);
      const srcAt = dedicated.meta?.updatedAt || 0;
      const tgtAt = existing?.meta?.updatedAt || 0;
      const decision = srcAt > tgtAt ? 'import-source' : 'keep-target';
      if (decision === 'import-source') await window.putLauncher(id, dedicated);
      return { decision, after: await window.getLauncher(id) };
    },
    { id: DOT, dedicated: suite.snapshot },
  );

  if (mergeResult.decision !== 'import-source') {
    throw new Error('rollback did not prefer dedicated');
  }
  if (mergeResult.after?.stores?.dotScore?.records?.['1']?.[3] !== 9) {
    throw new Error('launcher missing dedicated progress after rollback');
  }

  const launcherNewest = {
    stores: { dotScore: { records: { 1: [0, 0, 0, 11] } } },
    meta: { updatedAt: 50000, revision: 9 },
  };
  await page.evaluate(
    ({ id, snap }) => window.putLauncher(id, snap),
    { id: DOT, snap: launcherNewest },
  );
  const protect = await page.evaluate(
    async ({ id, olderDedicated }) => {
      const existing = await window.getLauncher(id);
      const srcAt = olderDedicated.meta?.updatedAt || 0;
      const tgtAt = existing?.meta?.updatedAt || 0;
      const decision = srcAt > tgtAt ? 'import-source' : 'keep-target';
      if (decision === 'import-source') await window.putLauncher(id, olderDedicated);
      return { decision, after: await window.getLauncher(id) };
    },
    { id: DOT, olderDedicated: dedicatedNewer },
  );

  if (protect.decision !== 'keep-target') {
    throw new Error('older dedicated clobbered newer launcher');
  }
  if (protect.after?.stores?.dotScore?.records?.['1']?.[3] !== 11) {
    throw new Error('newer launcher progress lost');
  }

  const report = {
    at: new Date().toISOString(),
    j2meOrigin,
    assertions: {
      staleLauncherKeptDedicated: keep.decision === 'keep-target',
      dedicatedScorePreserved: score === 9,
      rollbackImportedNewerDedicated: mergeResult.decision === 'import-source',
      newerLauncherProtected: protect.decision === 'keep-target',
    },
  };
  report.passed = Object.values(report.assertions).every(Boolean);
  await writeFile(
    join(evidenceDir, 'j2me-rms-rollback-safety-20261021.json'),
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
