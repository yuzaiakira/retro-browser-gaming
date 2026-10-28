/**
 * Real interactive MIT Dot MIDlet via self-hosted js2me + IndexedDB RMS.
 * Pass 1: boot, render, keypad fire, durable RMS write (persistent Chromium profile).
 * Pass 2: fresh process, network blocked before navigation; assets fulfilled from local
 *         cache (PWA stand-in); MIDlet relaunches and reads the same RMS record.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/j2me-js2me-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir, mkdtemp, rm } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { tmpdir } = require('node:os');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtureName = 'mit-j2me-dot.jar';
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = resolveEvidenceDir('PH-06');
const session = 'j2me-js2me-1';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.jar': 'application/java-archive',
  '.jad': 'text/plain',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.png': 'image/png',
};

const outer = `<!doctype html><title>J2ME js2me smoke</title>
<style>body{margin:0;background:#111}iframe{width:320px;height:520px;border:0}</style>
<iframe id="game" src="/runtime/j2me-frame.html"></iframe>
<script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const bytes = await (await fetch('/fixture.bin')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type:'init', session:'${session}',
      file:new File([bytes], '${fixtureName}', { type: 'application/java-archive' }),
      core:'js2me', name:'${fixtureName}', width: 240, height: 320
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 15000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'${session}',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'${session}',command,value}, location.origin);
</script>`;

function nonBlackPixels(png) {
  let count = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 40) count++;
  }
  return count;
}

function sampleHash(png) {
  let h = 0;
  for (let y = 4; y < png.height; y += 8) {
    for (let x = 4; x < png.width; x += 8) {
      const i = (y * png.width + x) * 4;
      h = (h * 33 + png.data[i] + png.data[i + 1] * 3 + png.data[i + 2] * 7) >>> 0;
    }
  }
  return h;
}

function scoreFromSnapshot(snap) {
  const store = snap?.stores?.dotScore;
  if (!store?.records?.['1']) return null;
  const b = store.records['1'];
  return ((b[0] & 0xff) << 24) | ((b[1] & 0xff) << 16) | ((b[2] & 0xff) << 8) | (b[3] & 0xff);
}

async function readPublic(pathname) {
  if (pathname === '/' || pathname === '') return Buffer.from(outer);
  if (pathname === '/fixture.bin') return readFile(fixture);
  return readFile(join(root, normalize(pathname).replace(/^[/\\]+/, '')));
}

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  try {
    const pathname = (request.url || '/').split('?')[0];
    const bytes = await readPublic(pathname);
    const ext = pathname === '/' ? '.html' : pathname === '/fixture.bin' ? '.jar' : extname(pathname);
    response.writeHead(200, {
      ...headers,
      'content-type': types[ext] || 'application/octet-stream',
      'content-length': bytes.length,
    });
    response.end(bytes);
  } catch {
    response.writeHead(404, headers).end();
  }
}

/** Fulfill from local tree so pass-2 can navigate with network disabled (cached-asset stand-in). */
async function installOfflineAssetRoutes(context) {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      const bytes = await readPublic(url.pathname);
      const ext = url.pathname === '/' ? '.html' : url.pathname === '/fixture.bin' ? '.jar' : extname(url.pathname);
      await route.fulfill({
        status: 200,
        body: bytes,
        headers: {
          'content-type': types[ext] || 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin',
        },
      });
    } catch {
      await route.abort();
    }
  });
}

async function fireTimes(page, n) {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => window.input(0, 1));
    await page.waitForTimeout(60);
    await page.evaluate(() => window.input(0, 0));
    await page.waitForTimeout(120);
  }
}

async function moveAndFire(page) {
  await page.evaluate(() => window.input(7, 1));
  await page.waitForTimeout(50);
  await page.evaluate(() => window.input(7, 0));
  await page.waitForTimeout(100);
  await fireTimes(page, 3);
}

async function run() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const jar = await readFile(fixture);
  if (jar.length < 100) throw new Error('Fixture JAR missing or tiny');

  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const profileDir = await mkdtemp(join(tmpdir(), 'j2me-rms-'));
  const origin = `http://127.0.0.1:${port}/`;

  let pass1Score = null;
  let midletId = null;
  let lit = 0;
  let inputChangedFrame = false;

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 480, height: 720 },
    });
    try {
      const page = await context.newPage();
      page.on('console', (message) => {
        const t = message.type();
        if (t === 'error' || t === 'warning') console.error(`CONSOLE [${t}] ${message.text()}`);
      });
      page.on('pageerror', (err) => console.error('PAGEERROR', err.message));

      await page.goto(origin);
      const result = await page.evaluate(() => window.result);
      if (!result.capabilities?.j2meRuntime) throw new Error('js2me runtime capability missing');
      midletId = result.capabilities.midletId;
      await page.waitForTimeout(800);

      const frame = page.locator('#game');
      const bootPng = PNG.sync.read(await frame.screenshot());
      lit = nonBlackPixels(bootPng);
      if (lit < 20) throw new Error(`J2ME canvas almost black after boot (${lit} lit pixels)`);

      await moveAndFire(page);
      await page.waitForTimeout(600);

      const afterPng = PNG.sync.read(await frame.screenshot());
      inputChangedFrame =
        sampleHash(bootPng) !== sampleHash(afterPng) || nonBlackPixels(afterPng) !== lit;

      let snap = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        snap = await page.evaluate(() => window.command('rmsSnapshot'));
        pass1Score = scoreFromSnapshot(snap);
        if (pass1Score != null && pass1Score >= 3) break;
        await page.waitForTimeout(200);
      }
      if (pass1Score == null || pass1Score < 3) {
        throw new Error(
          `RMS score not persisted after fire (score=${pass1Score}, snap=${JSON.stringify(snap)})`,
        );
      }

      await frame.screenshot({ path: join(evidenceDir, 'screenshots', 'j2me-dot-gameplay.png') });
      await page.evaluate(() => window.command('dispose'));
      await page.close();
    } finally {
      await context.close();
    }

    // Stop origin server before pass 2 — navigation cannot reach the live API/CDN.
    // Playwright routes fulfill previously "cached" VM/JAR/HTML from the local tree.
    await new Promise((resolve) => server.close(resolve));

    const context2 = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 480, height: 720 },
    });
    try {
      await installOfflineAssetRoutes(context2);
      await context2.setOffline(true);
      const page2 = await context2.newPage();
      page2.on('pageerror', (err) => console.error('PAGEERROR2', err.message));
      await page2.goto(origin, { waitUntil: 'domcontentloaded' });
      const result2 = await page2.evaluate(() => window.result);
      if (!result2.capabilities?.j2meRuntime) throw new Error('offline relaunch failed');

      let snap2 = null;
      let pass2Score = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        snap2 = await page2.evaluate(() => window.command('rmsSnapshot'));
        pass2Score = scoreFromSnapshot(snap2);
        if (pass2Score != null && pass2Score === pass1Score) break;
        await page2.waitForTimeout(200);
      }
      if (pass2Score !== pass1Score) {
        throw new Error(
          `Offline RMS mismatch: pass1=${pass1Score} pass2=${pass2Score} snap=${JSON.stringify(snap2)}`,
        );
      }

      await page2.locator('#game').screenshot({
        path: join(evidenceDir, 'screenshots', 'j2me-dot-offline-restore.png'),
      });

      console.log(
        'J2ME_GAMEPLAY_PASS',
        JSON.stringify({
          capabilities: result2.capabilities,
          lit,
          inputChangedFrame,
          pass1Score,
          pass2Score,
          midletId,
          offlineBeforeNavigation: true,
          originServerStopped: true,
          controlScheme: 'j2me-keypad',
          core: 'js2me',
          fixture: fixtureName,
          platform: 'j2me',
        }),
      );
    } finally {
      await context2.close();
    }
  } finally {
    try {
      server.close();
    } catch {
      /* already closed after pass 1 */
    }
    await rm(profileDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
