const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtures = join(__dirname, '..', '..', '..', '.fixtures');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const cueName = 'mit-ps1-dot.cue';
const companions = ['dot_track01.bin', 'dot_track02.bin'];
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.cue': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

const outer = `<!doctype html><title>PS1 real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const cue = await (await fetch('/fixture.cue')).blob();
    const companions = await Promise.all([
      fetch('/dot_track01.bin').then(r => r.blob()).then(b => new File([b], 'dot_track01.bin')),
      fetch('/dot_track02.bin').then(r => r.blob()).then(b => new File([b], 'dot_track02.bin')),
    ]);
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'ps1-smoke-1',
      file: new File([cue], '${cueName}'),
      companions,
      core: 'pcsx_rearmed',
      name: '${cueName}',
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 20000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'ps1-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'ps1-smoke-1',command,value}, location.origin);
window.isolation = () => ({
  crossOriginIsolated,
  sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
});
</script>`;

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (request.url === '/') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
  try {
    let requested;
    if (request.url === '/fixture.cue') requested = join(fixtures, cueName);
    else if (companions.includes(request.url.slice(1))) requested = join(fixtures, request.url.slice(1));
    else requested = join(root, normalize(request.url).replace(/^[/\\]+/, ''));
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

function greenDotCenter(png) {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const index = (y * png.width + x) * 4;
      const r = png.data[index];
      const g = png.data[index + 1];
      const b = png.data[index + 2];
      if (g > 140 && g > r + 40 && g > b + 40) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }
  if (count < 80) throw new Error(`PS1 green square not rendered (greenPixels=${count})`);
  return { x: sumX / count, y: sumY / count, count };
}

async function run() {
  const server = createServer((request, response) => {
    handler(request, response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
    });
    page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await page.evaluate(() => window.result);
    if (!result.capabilities?.saveState) throw new Error('PS1 core did not expose save state capability');
    if (!result.capabilities?.seekableMedia) throw new Error('Seekable media mount was not active under COOP/COEP');
    const isolation = await page.evaluate(() => window.isolation());
    if (!isolation.crossOriginIsolated) throw new Error('PS1 page was not cross-origin isolated');
    const seekable = await page.evaluate(() => window.command('seekableStats'));
    if (!seekable || seekable.payloadCapacity !== 8 * 1024 * 1024) {
      throw new Error(`unexpected seekable stats: ${JSON.stringify(seekable)}`);
    }
    await page.waitForTimeout(2500);
    await page.context().setOffline(true);
    const frame = page.locator('#game');
    const before = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    const state = await page.evaluate(() => window.command('save'));
    if (!(state?.byteLength > 1024)) throw new Error('PS1 core returned an implausibly small save state');
    await page.evaluate(() => window.input(6, 1));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.input(6, 0));
    await page.waitForTimeout(200);
    const moved = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    if (!(moved.x < before.x - 10)) {
      throw new Error(`PS1 left input did not move the green square: ${before.x} -> ${moved.x}`);
    }
    await page.evaluate((saved) => window.command('load', saved), state);
    await page.waitForTimeout(250);
    const restored = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    if (Math.abs(restored.x - before.x) > 6) {
      throw new Error(`PS1 save state did not restore square: ${before.x} -> ${restored.x}`);
    }
    const shot = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05', 'screenshots', 'ps1-gameplay.png');
    await page.screenshot({ path: shot, fullPage: true });
    await browser.close();

    // Fresh Chromium process: boot the same multi-file disc, cut the network after
    // local assets load, then prove interactive movement again.
    const browser2 = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    try {
      const page2 = await browser2.newPage({ viewport: { width: 1280, height: 900 } });
      await page2.goto(`http://127.0.0.1:${port}/`);
      await page2.evaluate(() => window.result);
      await page2.waitForTimeout(2500);
      await page2.context().setOffline(true);
      const frame2 = page2.locator('#game');
      const restarted = greenDotCenter(PNG.sync.read(await frame2.screenshot()));
      await page2.evaluate(() => window.input(6, 1));
      await page2.waitForTimeout(900);
      await page2.evaluate(() => window.input(6, 0));
      const afterRestartMove = greenDotCenter(PNG.sync.read(await frame2.screenshot()));
      if (!(afterRestartMove.x < restarted.x - 10)) {
        throw new Error(`PS1 fresh-browser left input failed: ${restarted.x} -> ${afterRestartMove.x}`);
      }
      console.log(
        `PS1_GAMEPLAY_PASS ${JSON.stringify({
          capabilities: result.capabilities,
          isolation,
          seekable,
          stateBytes: state.byteLength,
          before,
          moved,
          restored,
          restarted,
          afterRestartMove,
        })}`,
      );
    } finally {
      await browser2.close();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
