/**
 * Chromium smokes for MIT Paddle (Canvas arcade) and MIT Notes (Form+RMS).
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/j2me-multi-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixturesRoot = join(__dirname, '..', '..', '..', '.fixtures');
const evidenceDir = resolveEvidenceDir('PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jar': 'application/java-archive',
  '.png': 'image/png',
};

function outer(session, jarName) {
  return `<!doctype html><title>j2me multi</title>
<style>body{margin:0;background:#111}iframe{width:360px;height:560px;border:0}</style>
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
      file:new File([bytes], '${jarName}', { type: 'application/java-archive' }),
      core:'js2me', name:'${jarName}', screenProfile:'240x320', phoneFrame:true
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
}

function nonBlack(png) {
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 40) n++;
  }
  return n;
}

async function withServer(jarName, fn) {
  const fixture = join(fixturesRoot, jarName);
  const session = 'multi-' + jarName.replace(/[^a-z0-9]/gi, '');
  const server = createServer(async (req, res) => {
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy':
        "default-src 'self' blob:; script-src 'self' blob: 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors 'self'; base-uri 'none'",
    };
    try {
      const pathname = (req.url || '/').split('?')[0];
      if (pathname === '/') {
        res.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer(session, jarName));
        return;
      }
      const path =
        pathname === '/fixture.bin'
          ? fixture
          : join(root, normalize(pathname).replace(/^[/\\]+/, ''));
      const bytes = await readFile(path);
      res.writeHead(200, {
        ...headers,
        'content-type': types[extname(path)] || 'application/octet-stream',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404, headers).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    return await fn({ browser, port, session });
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

async function runPaddle() {
  return withServer('mit-j2me-paddle.jar', async ({ browser, port }) => {
    const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
    page.on('pageerror', (e) => console.error('PADDLE_ERR', e.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    const ready = await page.evaluate(() => window.result);
    if (!ready.capabilities?.j2meRuntime) throw new Error('paddle not ready');
    await page.waitForTimeout(600);
    const frame = page.locator('#game');
    const boot = PNG.sync.read(await frame.screenshot());
    const lit = nonBlack(boot);
    if (lit < 30) throw new Error(`paddle canvas dark (${lit})`);
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.input(6, 1)); // left
      await page.waitForTimeout(40);
      await page.evaluate(() => window.input(6, 0));
      await page.waitForTimeout(40);
      await page.evaluate(() => window.input(7, 1)); // right
      await page.waitForTimeout(40);
      await page.evaluate(() => window.input(7, 0));
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(800);
    let snap = null;
    for (let a = 0; a < 30; a++) {
      snap = await page.evaluate(() => window.command('rmsSnapshot'));
      if (snap?.stores?.paddleHi?.records?.['1']) break;
      await page.waitForTimeout(200);
    }
    await frame.screenshot({ path: join(evidenceDir, 'screenshots', 'j2me-paddle-gameplay.png') });
    return {
      midletId: ready.capabilities.midletId,
      lit,
      hasHiStore: !!snap?.stores?.paddleHi,
      jarSha256: ready.capabilities.jarSha256,
    };
  });
}

async function runNotes() {
  return withServer('mit-j2me-notes.jar', async ({ browser, port }) => {
    const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
    page.on('pageerror', (e) => console.error('NOTES_ERR', e.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    const ready = await page.evaluate(() => window.result);
    if (!ready.capabilities?.j2meRuntime) throw new Error('notes not ready');
    await page.waitForTimeout(500);
    const frameHandle = page.frames().find((f) => f.url().includes('j2me-frame'));
    if (!frameHandle) throw new Error('notes frame missing');
    // Fill TextField input inside Form
    const filled = await frameHandle.evaluate(() => {
      const input = document.querySelector('#screen input');
      if (!input) return false;
      input.value = 'hello-rms';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    if (!filled) throw new Error('notes TextField input missing');
    // Softkey Save — Display listens for mousedown on #choice (not click).
    await frameHandle.evaluate(() => {
      document.getElementById('choice').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    let snap = null;
    let body = null;
    for (let a = 0; a < 20; a++) {
      snap = await page.evaluate(() => window.command('rmsSnapshot'));
      const rec = snap?.stores?.notesBody?.records?.['1'];
      if (rec) {
        body = String.fromCharCode(...rec);
        break;
      }
      await page.waitForTimeout(150);
    }
    if (body !== 'hello-rms') {
      throw new Error(`notes RMS mismatch: ${JSON.stringify({ body, snap })}`);
    }
    await page.locator('#game').screenshot({
      path: join(evidenceDir, 'screenshots', 'j2me-notes-form.png'),
    });
    return {
      midletId: ready.capabilities.midletId,
      note: body,
      jarSha256: ready.capabilities.jarSha256,
    };
  });
}

async function main() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const paddle = await runPaddle();
  const notes = await runNotes();
  console.log('J2ME_MULTI_PASS', JSON.stringify({ paddle, notes }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
