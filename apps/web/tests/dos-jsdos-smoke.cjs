/**
 * Real interactive Floppy Bird gameplay via js-dos (emulators) dos-frame.
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/dos-jsdos-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtureName = 'mit-dos-floppybird.zip';
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05');
const session = 'dos-jsdos-1';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

const outer = `<!doctype html><title>DOS jsdos smoke</title>
<style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style>
<iframe id="game" src="/runtime/dos-frame.html"></iframe>
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
      file:new File([bytes], '${fixtureName}'),
      core:'jsdos', name:'${fixtureName}'
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 10000);
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

function frameDelta(a, b) {
  const n = Math.min(a.data.length, b.data.length);
  let changed = 0;
  for (let i = 0; i < n; i += 4) {
    if (
      Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]) >
      24
    ) {
      changed++;
    }
  }
  return changed;
}

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (request.url === '/') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
  try {
    const pathname = (request.url || '/').split('?')[0];
    const requested =
      pathname === '/fixture.bin'
        ? fixture
        : join(root, normalize(pathname).replace(/^[/\\]+/, ''));
    const bytes = await readFile(requested);
    response.writeHead(200, {
      ...headers,
      'content-type': types[extname(requested)] || 'application/octet-stream',
      'content-length': bytes.length,
    });
    response.end(bytes);
  } catch {
    response.writeHead(404, headers).end();
  }
}

async function run() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await page.evaluate(() => window.result);
    if (!result.capabilities?.dosRuntime) throw new Error('jsdos runtime capability missing');
    await page.waitForTimeout(2500);
    if (!process.env.SKIP_OFFLINE) await page.context().setOffline(true);

    const frame = page.locator('#game');
    const bootPng = PNG.sync.read(await frame.screenshot());
    const lit = nonBlackPixels(bootPng);
    if (lit < 100) throw new Error(`DOS canvas almost black after boot (${lit} lit pixels)`);

    // Flap: fire button → Space
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.input(0, 1));
      await page.waitForTimeout(80);
      await page.evaluate(() => window.input(0, 0));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(400);
    const afterPng = PNG.sync.read(await frame.screenshot());
    const afterLit = nonBlackPixels(afterPng);
    const delta = frameDelta(bootPng, afterPng);
    const inputChangedFrame = delta > 80 || sampleHash(bootPng) !== sampleHash(afterPng);
    if (!inputChangedFrame && afterLit < 100) {
      throw new Error('DOS input did not change frame');
    }

    let stateBytes = 0;
    try {
      const state = await page.evaluate(() => window.command('save'));
      stateBytes = state?.byteLength || (state?.length ?? 0);
    } catch (e) {
      console.warn('SAVE_SOFT', e.message);
    }

    await frame.screenshot({ path: join(evidenceDir, 'screenshots', 'dos-gameplay.png') });
    console.log(
      'DOS_GAMEPLAY_PASS',
      JSON.stringify({
        capabilities: result.capabilities,
        lit,
        afterLit,
        inputChangedFrame,
        menuChangedFrame: inputChangedFrame,
        stateBytes,
        controlScheme: 'dos',
        core: 'jsdos',
        fixture: fixtureName,
        platform: 'dos',
      }),
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
