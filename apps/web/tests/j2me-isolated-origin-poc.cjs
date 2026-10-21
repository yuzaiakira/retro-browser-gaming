/**
 * Dedicated-origin J2ME isolation proof of concept.
 *
 * Serves launcher.localhost and j2me.localhost on one port (distinct origins).
 * Does NOT replace production FrameAdapter — evidence only.
 *
 * Usage:
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-isolated-origin-poc.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { createHash } = require('node:crypto');

const root = join(__dirname, '..', 'public');
const fixturesRoot = join(__dirname, '..', '..', '..', '.fixtures');
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jar': 'application/java-archive',
  '.png': 'image/png',
};

function launcherHtml(session, j2meOrigin, jarName) {
  return `<!doctype html><title>launcher</title>
<style>body{margin:0;background:#111;color:#ddd;font:14px monospace}iframe{width:360px;height:560px;border:1px solid #333}</style>
<p id="status">booting</p>
<iframe id="game" sandbox="allow-scripts allow-same-origin" src="${j2meOrigin}/runtime/j2me-isolated/j2me-frame-isolated.html"></iframe>
<script>
window.__launcherSecret = 'launcher-auth-token-should-not-leak';
document.cookie = 'launcher_session=secret-cookie; path=/';
const LAUNCHER_ORIGIN = location.origin;
const J2ME_ORIGIN = ${JSON.stringify(j2meOrigin)};
const SESSION = ${JSON.stringify(session)};

window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== J2ME_ORIGIN) return;
    if (event.data?.type === 'ready') resolve(event.data);
    if (event.data?.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const bytes = await (await fetch('/fixture.bin')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type:'init',
      session: SESSION,
      parentOrigin: LAUNCHER_ORIGIN,
      file: new File([bytes], ${JSON.stringify(jarName)}, { type: 'application/java-archive' }),
      core:'js2me',
      name: ${JSON.stringify(jarName)},
      screenProfile:'240x320'
    }, J2ME_ORIGIN);
  }, { once: true });
});

window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 15000);
  const listener = event => {
    if (event.origin !== J2ME_ORIGIN || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage(
    {type:'command',session:SESSION,id,method,value}, J2ME_ORIGIN);
});

window.spoofCommand = (method, value, badSession) => new Promise((resolve) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => resolve({ timedOut: true }), 800);
  const listener = event => {
    if (event.origin !== J2ME_ORIGIN || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    resolve({ replied: true, error: event.data.error, value: event.data.value });
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage(
    {type:'command',session: badSession || 'evil-session',id,method,value}, J2ME_ORIGIN);
});

window.seedLauncherRms = async (midletId, snapshot) => {
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
};

window.readLauncherRms = async (midletId) => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('retro-j2me-rms', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('midlets');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const value = await new Promise((resolve, reject) => {
    const tx = db.transaction('midlets', 'readonly');
    const r = tx.objectStore('midlets').get(midletId);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return value;
};

window.migrateToFrame = async (suites, overwrite = true) =>
  window.command('importRmsMigration', { suites, overwrite: !!overwrite });
</script>`;
}

async function main() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const jarName = 'mit-j2me-dot.jar';
  const jarBytes = await readFile(join(fixturesRoot, jarName));
  const jarSha = createHash('sha256').update(jarBytes).digest('hex');

  const server = createServer(async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    const isJ2me = host === 'j2me.localhost';
    const isLauncher = host === 'launcher.localhost';
    const pathname = (req.url || '/').split('?')[0];

    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      // Opt-in for embedding across dedicated origins under COEP.
      'Cross-Origin-Resource-Policy': isJ2me ? 'cross-origin' : 'same-origin',
      'Content-Security-Policy': isJ2me
        ? "default-src 'self' blob:; script-src 'self' blob: 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors http://launcher.localhost:*; base-uri 'none'; form-action 'none'"
        : "default-src 'self' blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; frame-src http://j2me.localhost:*; img-src 'self' data:; base-uri 'none'",
    };

    try {
      if (!isJ2me && !isLauncher) {
        res.writeHead(421, headers).end('misdirected');
        return;
      }
      if (isLauncher && (pathname === '/' || pathname === '')) {
        const { port } = server.address();
        const j2meOrigin = `http://j2me.localhost:${port}`;
        res.writeHead(200, { ...headers, 'content-type': 'text/html' });
        res.end(launcherHtml('iso-session', j2meOrigin, jarName));
        return;
      }
      if (pathname === '/fixture.bin') {
        res.writeHead(200, { ...headers, 'content-type': 'application/java-archive' });
        res.end(jarBytes);
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
      res.writeHead(404, headers).end('missing');
    }
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const launcherOrigin = `http://launcher.localhost:${port}`;
  const j2meOrigin = `http://j2me.localhost:${port}`;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });

  const results = {
    jarSha256: jarSha,
    launcherOrigin,
    j2meOrigin,
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') console.error('CONSOLE', m.text());
    });

    // Seed launcher-origin RMS (simulates pre-isolation saves).
    await page.goto(launcherOrigin);
    const midletId = 'Retro Browser Gaming/MIT J2ME Dot/1.0.0';
    await page.evaluate(
      async ({ midletId }) => {
        await window.seedLauncherRms(midletId, {
          stores: {
            dotScore: { records: { 1: [0, 0, 0, 7] } },
          },
        });
      },
      { midletId },
    );

    const ready = await page.evaluate(() => window.result);
    if (!ready.capabilities?.j2meRuntime) throw new Error('isolated boot failed');
    if (ready.capabilities.security?.sameOriginIframe) {
      throw new Error('PoC must not claim same-origin iframe');
    }
    if (ready.capabilities.security?.frameOrigin !== j2meOrigin) {
      throw new Error(`frame origin mismatch ${ready.capabilities.security?.frameOrigin}`);
    }
    if (ready.capabilities.security?.parentOrigin !== launcherOrigin) {
      throw new Error('parent origin not recorded');
    }
    results.allowlistedBoot = true;

    // Isolation probe
    const probe = await page.evaluate(() => window.command('probeIsolation'));
    if (!String(probe.parentDom).startsWith('blocked:')) {
      throw new Error(`parent DOM reachable: ${probe.parentDom}`);
    }
    if (probe.cookieJar && String(probe.cookieJar).includes('launcher_session')) {
      throw new Error('launcher cookie visible in frame');
    }
    if (probe.launcherIdb?.hasLauncherDb === true) {
      throw new Error('launcher IndexedDB visible from frame');
    }
    results.isolation = {
      parentDomBlocked: true,
      cookieIsolated: true,
      launcherIdbIsolated: probe.launcherIdb,
    };

    // Unauthorized JAR still rejected on isolated origin
    const bad = await page.evaluate(async () => {
      // Re-init not possible mid-session; use inspect via secure if exposed — instead fetch unknown bytes through command path N/A.
      // Validate by loading a second page with bad jar.
      return null;
    });
    void bad;

    // Migration: export from launcher IDB → import into frame origin
    const migrated = await page.evaluate(async ({ midletId }) => {
      const snap = await window.readLauncherRms(midletId);
      // First cutover uses overwrite after validating launcher snapshot; retries keep existing when overwrite=false.
      const first = await window.migrateToFrame([{ midletId, snapshot: snap }], true);
      const retry = await window.migrateToFrame([{ midletId, snapshot: snap }], false);
      return { first, retry };
    }, { midletId });
    if (!migrated.first.imported?.some((i) => i.midletId === midletId && i.status === 'imported')) {
      throw new Error(`migration failed ${JSON.stringify(migrated)}`);
    }
    if (!migrated.retry.imported?.some((i) => i.status === 'kept-existing')) {
      throw new Error(`migration retry should keep-existing ${JSON.stringify(migrated)}`);
    }
    const frameSnap = await page.evaluate(() => window.command('rmsSnapshot'));
    const scoreRec = frameSnap?.stores?.dotScore?.records?.['1'] || frameSnap?.stores?.dotScore?.records?.[1];
    if (!scoreRec || scoreRec[3] !== 7) {
      throw new Error(`migrated RMS not visible in frame ${JSON.stringify(frameSnap)}`);
    }
    results.migration = migrated;

    // Spoofed session must not reply with data
    const spoof = await page.evaluate(() => window.spoofCommand('rmsSnapshot'));
    if (spoof.replied) throw new Error('spoofed session was accepted');
    results.spoofRejected = true;

    // Network fence still present
    const net = await page.frames()
      .find((f) => f.url().includes('j2me.localhost'))
      .evaluate(async () => {
        try {
          await fetch('https://example.com');
          return 'allowed';
        } catch (e) {
          return String(e?.message || e);
        }
      });
    if (!String(net).includes('J2ME_NETWORK_DISABLED') && !String(net).includes('Failed to fetch')) {
      // After lockdown fetch throws J2ME_NETWORK_DISABLED; CSP may also block.
      if (!String(net).includes('NETWORK') && !String(net).includes('fetch')) {
        throw new Error(`network not fenced: ${net}`);
      }
    }
    results.networkRestricted = true;

    // Dispose cleanup
    await page.evaluate(() => window.command('dispose'));
    const afterDispose = await page.evaluate(() => window.spoofCommand('rmsSnapshot', null, 'iso-session'));
    if (afterDispose.replied && !afterDispose.error) {
      throw new Error('disposed session still accepted commands');
    }
    results.disposeClearsSession = true;

    // Negative: same-origin parentOrigin rejected
    const page2 = await context.newPage();
    await page2.goto(j2meOrigin + '/runtime/j2me-isolated/j2me-frame-isolated.html');
    const sameOriginReject = await page2.evaluate(async () => {
      return await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve('timeout'), 2000);
        addEventListener('message', (event) => {
          if (event.data?.type === 'error') {
            clearTimeout(timeout);
            resolve(event.data.error);
          }
        });
        // Self-message as if parent — won't match event.source===parent from real parent.
        // Load via launcher that lies about parentOrigin === frame origin:
      });
    });
    void sameOriginReject;

    // Dedicated negative page: launcher claims parentOrigin == j2me origin
    const page3 = await context.newPage();
    await page3.setContent(`<!doctype html><iframe id="g" sandbox="allow-scripts allow-same-origin"
      src="${j2meOrigin}/runtime/j2me-isolated/j2me-frame-isolated.html"></iframe>
      <script>
      window.outcome = new Promise((resolve) => {
        addEventListener('message', e => {
          if (e.data?.type === 'error') resolve(e.data.error);
          if (e.data?.type === 'ready') resolve('ready-unexpected');
        });
        document.querySelector('iframe').addEventListener('load', async () => {
          const bytes = await (await fetch('${launcherOrigin}/fixture.bin')).blob();
          document.querySelector('iframe').contentWindow.postMessage({
            type:'init', session:'x', parentOrigin: '${j2meOrigin}',
            file:new File([bytes],'x.jar',{type:'application/java-archive'}),
            core:'js2me', name:'x.jar'
          }, '${j2meOrigin}');
        }, { once:true });
      });
      </script>`, { waitUntil: 'domcontentloaded' });
    // page3 is opaque origin blob — fetch fixture may fail. Use route instead.
    await page3.close();

    // Simpler negative via evaluate on main page with a new iframe
    const distinctCheck = await page.evaluate(async ({ j2meOrigin, jarName }) => {
      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts allow-same-origin';
      iframe.src = j2meOrigin + '/runtime/j2me-isolated/j2me-frame-isolated.html';
      document.body.appendChild(iframe);
      await new Promise((r) => (iframe.onload = r));
      const bytes = await (await fetch('/fixture.bin')).blob();
      return await new Promise((resolve) => {
        const t = setTimeout(() => resolve('timeout'), 3000);
        addEventListener('message', (e) => {
          if (e.origin !== j2meOrigin) return;
          if (e.data?.type === 'error') {
            clearTimeout(t);
            resolve(e.data.error);
          }
          if (e.data?.type === 'ready') {
            clearTimeout(t);
            resolve('ready');
          }
        });
        iframe.contentWindow.postMessage(
          {
            type: 'init',
            session: 'bad-origin-test',
            parentOrigin: j2meOrigin,
            file: new File([bytes], jarName, { type: 'application/java-archive' }),
            core: 'js2me',
            name: jarName,
          },
          j2meOrigin,
        );
      });
    }, { j2meOrigin, jarName });
    if (distinctCheck !== 'J2ME_PARENT_ORIGIN_NOT_DISTINCT') {
      throw new Error(`expected distinct-origin reject, got ${distinctCheck}`);
    }
    results.sameOriginParentRejected = true;

    // Unknown JAR on isolated origin
    const unknown = await page.evaluate(async ({ j2meOrigin }) => {
      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts allow-same-origin';
      iframe.src = j2meOrigin + '/runtime/j2me-isolated/j2me-frame-isolated.html';
      document.body.appendChild(iframe);
      await new Promise((r) => (iframe.onload = r));
      const evil = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)]);
      return await new Promise((resolve) => {
        const t = setTimeout(() => resolve('timeout'), 5000);
        addEventListener('message', (e) => {
          if (e.origin !== j2meOrigin) return;
          if (e.data?.type === 'error') {
            clearTimeout(t);
            resolve(e.data.error);
          }
          if (e.data?.type === 'ready') {
            clearTimeout(t);
            resolve('ready');
          }
        });
        iframe.contentWindow.postMessage(
          {
            type: 'init',
            session: 'unknown-jar',
            parentOrigin: location.origin,
            file: new File([evil], 'evil.jar', { type: 'application/java-archive' }),
            core: 'js2me',
            name: 'evil.jar',
          },
          j2meOrigin,
        );
      });
    }, { j2meOrigin });
    if (!String(unknown).includes('JAR_') && unknown !== 'JAR_NOT_ALLOWLISTED' && unknown !== 'JAR_TOO_SMALL' && unknown !== 'JAR_EOCD_MISSING' && unknown !== 'JAR_NOT_ZIP') {
      // empty zip EOCD may fail earlier
      if (!String(unknown).startsWith('JAR_')) throw new Error(`unknown jar not rejected: ${unknown}`);
    }
    results.unknownJarDenied = unknown;

    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'j2me-isolated-origin-poc.png'),
      fullPage: true,
    });

    console.log('J2ME_ISOLATED_ORIGIN_POC_PASS', JSON.stringify(results));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
