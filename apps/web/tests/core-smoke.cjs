const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { mkdir, readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtureName = process.env.GENESIS_FIXTURE || 'mit-genesis-breakout.bin';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = resolveEvidenceDir('PH-05');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.data': 'application/octet-stream', '.json': 'application/json', '.bin': 'application/octet-stream' };
const outer = `<!doctype html><title>Genesis real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.bin');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({type:'init',session:'core-smoke-1',file:new File([bytes], '${fixtureName}'),core:'genesis_plus_gx',name:'${fixtureName}'}, location.origin);
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'core-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'core-smoke-1',command,value}, location.origin);
</script>`;

async function handler(request, response) {
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' };
  if (request.url === '/') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
  try {
    const pathname = (request.url || '/').split('?')[0];
    const requested = pathname === '/fixture.bin' ? fixture : join(root, normalize(pathname).replace(/^[/\\]+/, ''));
    const bytes = await readFile(requested);
    response.writeHead(200, { ...headers, 'content-type': types[extname(requested)] || 'application/octet-stream', 'content-length': bytes.length });
    response.end(bytes);
  } catch { response.writeHead(404, headers).end(); }
}

const isPong = /pong/i.test(fixtureName);

function paddleCenter(png) {
  let best;
  for (let y = Math.floor(png.height * 0.45); y < png.height; y++) {
    let runStart = -1;
    for (let x = 0; x <= png.width; x++) {
      const index = (y * png.width + x) * 4;
      const green = x < png.width && png.data[index] < 32 && png.data[index + 1] > 128 && png.data[index + 2] < 32;
      if (green && runStart < 0) runStart = x;
      if (!green && runStart >= 0) {
        const width = x - runStart;
        if (width >= 40 && (!best || width > best.width)) best = { center: runStart + width / 2, width, y };
        runStart = -1;
      }
    }
  }
  if (!best) throw new Error('Genesis Breakout paddle was not rendered');
  return best;
}

function nonBlackPixels(png) {
  let count = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 40) count++;
  }
  return count;
}

function sampleHash(png) {
  let h = 0;
  for (let y = 8; y < png.height; y += 32) {
    for (let x = 8; x < png.width; x += 32) {
      const i = (y * png.width + x) * 4;
      h = (h * 33 + png.data[i] + png.data[i + 1] * 3 + png.data[i + 2] * 7) >>> 0;
    }
  }
  return h;
}

/** Left (green) vertical paddle centroid for MIT Genesis Pong. */
function pongPaddleCenter(png) {
  let best;
  const y0 = Math.floor(png.height * 0.05);
  const y1 = Math.floor(png.height * 0.9);
  const xMax = Math.floor(png.width * 0.4);
  for (let x = 0; x < xMax; x++) {
    let runStart = -1;
    for (let y = y0; y <= y1; y++) {
      const index = (y * png.width + x) * 4;
      const green = png.data[index] < 48 && png.data[index + 1] > 160 && png.data[index + 2] < 48;
      if (green && runStart < 0) runStart = y;
      if ((!green || y === y1) && runStart >= 0) {
        const height = y - runStart + (green ? 1 : 0);
        if (height >= 12 && (!best || height > best.height)) best = { center: runStart + height / 2, height, x };
        runStart = -1;
      }
    }
  }
  if (!best) throw new Error('Genesis Pong paddle was not rendered');
  return best;
}

async function run() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const server = createServer((request, response) => { handler(request, response); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => { if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await page.evaluate(() => window.result);
    if (!result.capabilities?.saveState) throw new Error('Genesis core did not expose save state capability');
    if (!result.capabilities?.seekableMedia) throw new Error('Seekable media mount was not active under COOP/COEP');
    const seekable = await page.evaluate(() => window.command('seekableStats'));
    if (!seekable || seekable.payloadCapacity !== 8 * 1024 * 1024) throw new Error(`unexpected seekable stats: ${JSON.stringify(seekable)}`);
    if (seekable.peakPayload > 8 * 1024 * 1024) throw new Error(`seekable peak payload exceeded bound: ${seekable.peakPayload}`);
    // The core and legal ROM are already loaded. Gameplay must not need the
    // local HTTP server after this point.
    await page.context().setOffline(true);
    await page.evaluate(() => window.input(3, 1));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.input(3, 0));
    await page.waitForTimeout(isPong ? 400 : 700);
    if (isPong) {
      await page.evaluate(() => window.input(0, 1));
      await page.waitForTimeout(200);
      await page.evaluate(() => window.input(0, 0));
      await page.waitForTimeout(900);
    }
    const frame = page.locator('#game');
    if (isPong) {
      const beforePng = PNG.sync.read(await frame.screenshot());
      const lit = nonBlackPixels(beforePng);
      if (lit < 80) throw new Error(`Genesis Pong canvas almost black after boot (${lit} lit pixels)`);
      const before = pongPaddleCenter(beforePng);
      const beforeHash = sampleHash(beforePng);
      const state = await page.evaluate(() => window.command('save'));
      if (!(state?.byteLength > 1024)) throw new Error('Genesis core returned an implausibly small save state');
      await page.evaluate(() => window.input(4, 1));
      await page.waitForTimeout(450);
      await page.evaluate(() => window.input(4, 0));
      await page.waitForTimeout(200);
      const movedPng = PNG.sync.read(await frame.screenshot());
      const moved = pongPaddleCenter(movedPng);
      const movedHash = sampleHash(movedPng);
      if (!(moved.center < before.center - 8) && movedHash === beforeHash) {
        throw new Error(`Genesis Pong up input did not move paddle/frame: ${before.center} -> ${moved.center}`);
      }
      await page.evaluate((saved) => window.command('load', saved), state);
      await page.waitForTimeout(150);
      const restored = pongPaddleCenter(PNG.sync.read(await frame.screenshot()));
      if (Math.abs(restored.center - before.center) > 6) {
        throw new Error(`Genesis Pong save state did not restore paddle: ${before.center} -> ${restored.center}`);
      }
      await page.screenshot({ path: join(evidenceDir, 'screenshots', 'genesis-pong-gameplay.png'), fullPage: true });
      console.log(`GENESIS_GAMEPLAY_PASS ${JSON.stringify({
        fixture: fixtureName,
        capabilities: result.capabilities,
        stateBytes: state.byteLength,
        lit,
        before: before.center,
        moved: moved.center,
        restored: restored.center,
        inputChangedFrame: movedHash !== beforeHash,
      })}`);
    } else {
      const before = paddleCenter(PNG.sync.read(await frame.screenshot()));
      const state = await page.evaluate(() => window.command('save'));
      if (!(state?.byteLength > 1024)) throw new Error('Genesis core returned an implausibly small save state');
      await page.evaluate(() => window.input(6, 1));
      await page.waitForTimeout(450);
      await page.evaluate(() => window.input(6, 0));
      const moved = paddleCenter(PNG.sync.read(await frame.screenshot()));
      if (!(moved.center < before.center - 12)) throw new Error(`Genesis left input did not move the paddle: ${before.center} -> ${moved.center}`);
      await page.evaluate((saved) => window.command('load', saved), state);
      await page.waitForTimeout(150);
      const restored = paddleCenter(PNG.sync.read(await frame.screenshot()));
      if (Math.abs(restored.center - before.center) > 3) throw new Error(`Genesis save state did not restore paddle position: ${before.center} -> ${restored.center}`);
      await page.screenshot({ path: join(evidenceDir, 'screenshots', 'genesis-gameplay.png'), fullPage: true });
      console.log(`GENESIS_GAMEPLAY_PASS ${JSON.stringify({ capabilities: result.capabilities, stateBytes: state.byteLength, before: before.center, moved: moved.center, restored: restored.center })}`);
    }
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
