/**
 * RMS migration PoC: launcher-origin saves for Dot/Paddle/Notes → dedicated j2me origin,
 * then browser restart + offline restore on the isolated origin.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-rms-migration-poc.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, mkdir, mkdtemp, rm } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { tmpdir } = require('node:os');

const root = join(__dirname, '..', 'public');
const fixturesRoot = join(__dirname, '..', '..', '..', '.fixtures');
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const SUITES = [
  {
    midletId: 'Retro Browser Gaming/MIT J2ME Dot/1.0.0',
    jar: 'mit-j2me-dot.jar',
    snapshot: { stores: { dotScore: { records: { 1: [0, 0, 0, 9] } } } },
    expect: (snap) => snap?.stores?.dotScore?.records?.['1']?.[3] === 9,
  },
  {
    midletId: 'Retro Browser Gaming/MIT J2ME Paddle/1.0.0',
    jar: 'mit-j2me-paddle.jar',
    snapshot: { stores: { paddleHi: { records: { 1: [0, 0, 0, 5] } } } },
    expect: (snap) => snap?.stores?.paddleHi?.records?.['1']?.[3] === 5,
  },
  {
    midletId: 'Retro Browser Gaming/MIT J2ME Notes/1.0.0',
    jar: 'mit-j2me-notes.jar',
    snapshot: {
      stores: {
        notesBody: {
          records: {
            1: [...Buffer.from('migrated-note')],
          },
        },
      },
    },
    expect: (snap) => {
      const rec = snap?.stores?.notesBody?.records?.['1'];
      return rec && String.fromCharCode(...rec) === 'migrated-note';
    },
  },
];

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jar': 'application/java-archive',
};

function pageHtml(session, j2meOrigin, jarName) {
  return `<!doctype html><title>migrate</title>
<iframe id="game" sandbox="allow-scripts allow-same-origin"
  src="${j2meOrigin}/runtime/j2me-isolated/j2me-frame-isolated.html"></iframe>
<script>
const J2ME=${JSON.stringify(j2meOrigin)};
const SESSION=${JSON.stringify(session)};
window.ready = new Promise((resolve, reject) => {
  addEventListener('message', e => {
    if (e.origin !== J2ME) return;
    if (e.data?.type==='ready') resolve(e.data);
    if (e.data?.type==='error') reject(new Error(e.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const bytes = await (await fetch('/fixture.bin')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type:'init', session:SESSION, parentOrigin:location.origin,
      file:new File([bytes], ${JSON.stringify(jarName)}, {type:'application/java-archive'}),
      core:'js2me', name:${JSON.stringify(jarName)}
    }, J2ME);
  }, {once:true});
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const t = setTimeout(() => reject(new Error(method+' timeout')), 15000);
  const listener = e => {
    if (e.origin!==J2ME || e.data?.type!=='reply' || e.data?.id!==id) return;
    removeEventListener('message', listener); clearTimeout(t);
    e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:SESSION,id,method,value}, J2ME);
});
</script>`;
}

async function main() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const profileDir = await mkdtemp(join(tmpdir(), 'j2me-migrate-'));
  let port;

  const server = createServer(async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    const isJ2me = host === 'j2me.localhost';
    const isLauncher = host === 'launcher.localhost';
    const pathname = (req.url || '/').split('?')[0];
    const jarName = server._jarName || 'mit-j2me-dot.jar';
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': isJ2me ? 'cross-origin' : 'same-origin',
      'Content-Security-Policy': isJ2me
        ? "default-src 'self' blob:; script-src 'self' blob: 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; frame-ancestors http://launcher.localhost:*; base-uri 'none'"
        : "default-src 'self' blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; frame-src http://j2me.localhost:*; base-uri 'none'",
    };
    try {
      if (!isJ2me && !isLauncher) {
        res.writeHead(421, headers).end();
        return;
      }
      if (isLauncher && pathname === '/') {
        res.writeHead(200, { ...headers, 'content-type': 'text/html' });
        res.end(pageHtml('mig', `http://j2me.localhost:${port}`, jarName));
        return;
      }
      if (pathname === '/fixture.bin') {
        res.writeHead(200, { ...headers, 'content-type': 'application/java-archive' });
        res.end(await readFile(join(fixturesRoot, jarName)));
        return;
      }
      const filePath = join(root, normalize(pathname).replace(/^[/\\]+/, ''));
      const bytes = await readFile(filePath);
      res.writeHead(200, {
        ...headers,
        'content-type': types[extname(filePath)] || 'application/octet-stream',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404, headers).end();
    }
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  const launcherOrigin = `http://launcher.localhost:${port}`;
  const results = {};

  try {
    for (const suite of SUITES) {
      server._jarName = suite.jar;
      const context = await chromium.launchPersistentContext(profileDir, {
        executablePath,
        headless: true,
        args: ['--no-sandbox'],
      });
      try {
        const page = await context.newPage();
        // Seed on launcher origin first (no frame)
        await page.goto(launcherOrigin);
        await page.evaluate(async ({ midletId, snapshot }) => {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('retro-j2me-rms', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('midlets');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          await new Promise((resolve, reject) => {
            const tx = db.transaction('midlets', 'readwrite');
            tx.objectStore('midlets').put(snapshot, midletId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          db.close();
        }, { midletId: suite.midletId, snapshot: suite.snapshot });

        await page.reload();
        await page.evaluate(() => window.ready);
        const imported = await page.evaluate(
          async ({ midletId, snapshot }) =>
            window.command('importRmsMigration', {
              suites: [{ midletId, snapshot }],
              overwrite: true,
            }),
          { midletId: suite.midletId, snapshot: suite.snapshot },
        );
        const snap = await page.evaluate(() => window.command('rmsSnapshot'));
        if (!suite.expect(snap)) {
          throw new Error(`${suite.jar}: migrated state missing ${JSON.stringify(snap)}`);
        }
        // Cross-suite: only this suite's stores
        const foreign = Object.keys(snap?.stores || {}).filter(
          (n) =>
            !Object.keys(suite.snapshot.stores).includes(n),
        );
        if (foreign.length) throw new Error(`${suite.jar}: unexpected stores ${foreign}`);
        results[suite.jar] = { migrated: true, imported };
        await page.evaluate(() => window.command('dispose'));
        await page.close();
      } finally {
        await context.close();
      }
    }

    // Offline cold restore on dedicated origin for Notes (last suite) after stop server network
    server._jarName = 'mit-j2me-notes.jar';
    const context2 = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
    });
    try {
      await context2.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const host = url.hostname;
        const pathname = url.pathname;
        const isJ2me = host === 'j2me.localhost';
        const headers = {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': isJ2me ? 'cross-origin' : 'same-origin',
          'Content-Security-Policy': isJ2me
            ? "default-src 'self' blob:; script-src 'self' blob: 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; frame-ancestors http://launcher.localhost:*; base-uri 'none'"
            : "default-src 'self' blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; frame-src http://j2me.localhost:*; base-uri 'none'",
        };
        try {
          if (host === 'launcher.localhost' && pathname === '/') {
            await route.fulfill({
              status: 200,
              body: pageHtml('mig', `http://j2me.localhost:${port}`, 'mit-j2me-notes.jar'),
              headers: { ...headers, 'content-type': 'text/html' },
            });
            return;
          }
          if (pathname === '/fixture.bin') {
            await route.fulfill({
              status: 200,
              body: await readFile(join(fixturesRoot, 'mit-j2me-notes.jar')),
              headers: { ...headers, 'content-type': 'application/java-archive' },
            });
            return;
          }
          const filePath = join(root, normalize(pathname).replace(/^[/\\]+/, ''));
          await route.fulfill({
            status: 200,
            body: await readFile(filePath),
            headers: { ...headers, 'content-type': types[extname(filePath)] || 'application/octet-stream' },
          });
        } catch {
          await route.abort();
        }
      });
      await new Promise((r) => server.close(r));
      await context2.setOffline(true);
      const page = await context2.newPage();
      await page.goto(launcherOrigin);
      await page.evaluate(() => window.ready);
      const snap = await page.evaluate(() => window.command('rmsSnapshot'));
      const notes = SUITES[2];
      if (!notes.expect(snap)) {
        throw new Error(`offline migrate restore failed ${JSON.stringify(snap)}`);
      }
      results.offlineNotesRestore = true;
      await page.screenshot({
        path: join(evidenceDir, 'screenshots', 'j2me-rms-migration-offline.png'),
      });
    } finally {
      await context2.close();
    }

    console.log('J2ME_RMS_MIGRATION_POC_PASS', JSON.stringify(results));
  } finally {
    try {
      server.close();
    } catch {
      /* closed */
    }
    await rm(profileDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
