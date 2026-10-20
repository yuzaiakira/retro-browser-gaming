const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtures = join(__dirname, '..', '..', '..', '.fixtures');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const fixtureName = 'mit-psp-dot.pbp';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.pbp': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

const outer = `<!doctype html><title>PSP real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const bytes = await (await fetch('/fixture.pbp')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'psp-smoke-1',
      file: new File([bytes], '${fixtureName}'),
      core: 'ppsspp',
      name: '${fixtureName}',
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 30000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'psp-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'psp-smoke-1',command,value}, location.origin);
window.isolation = () => ({
  crossOriginIsolated,
  sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  sabByteLength: typeof SharedArrayBuffer !== 'undefined' ? new SharedArrayBuffer(8).byteLength : 0,
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
    const requested =
      request.url === '/fixture.pbp'
        ? join(fixtures, fixtureName)
        : join(root, normalize(request.url).replace(/^[/\\]+/, ''));
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
  if (count < 80) throw new Error(`PSP green square not rendered (greenPixels=${count})`);
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
      if (['error', 'warning', 'log'].includes(message.type())) console.error(`CONSOLE ${message.type()} ${message.text()}`);
    });
    page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await Promise.race([
      page.evaluate(() => window.result),
      page.waitForTimeout(120000).then(() => {
        throw new Error('PSP core ready timed out');
      }),
    ]);
    if (!result.capabilities?.saveState) throw new Error('PSP core did not expose save state capability');
    if (!result.capabilities?.seekableMedia) throw new Error('Seekable media mount was not active under COOP/COEP');
    if (!result.capabilities?.analog) throw new Error('PSP core did not report analog capability');
    const isolation = await page.evaluate(() => window.isolation());
    if (!isolation.crossOriginIsolated) throw new Error('PSP page was not cross-origin isolated');
    if (!isolation.sharedArrayBuffer) throw new Error('SharedArrayBuffer unavailable for threaded PPSSPP');
    const seekable = await page.evaluate(() => window.command('seekableStats'));
    if (!seekable || seekable.payloadCapacity !== 8 * 1024 * 1024) {
      throw new Error(`unexpected seekable stats: ${JSON.stringify(seekable)}`);
    }
    await page.waitForTimeout(2500);
    await page.context().setOffline(true);
    const frame = page.locator('#game');
    const before = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    const state = await page.evaluate(() => window.command('save'));
    if (!(state?.byteLength > 1024)) throw new Error('PSP core returned an implausibly small save state');
    await page.evaluate(() => window.input(6, 1));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.input(6, 0));
    await page.waitForTimeout(200);
    const moved = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    if (!(moved.x < before.x - 10)) {
      throw new Error(`PSP left input did not move the green square: ${before.x} -> ${moved.x}`);
    }
    await page.evaluate((saved) => window.command('load', saved), state);
    await page.waitForTimeout(250);
    const restored = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    if (Math.abs(restored.x - before.x) > 8) {
      throw new Error(`PSP save state did not restore square: ${before.x} -> ${restored.x}`);
    }
    const heap = await page.evaluate(async () => {
      if (!performance.measureUserAgentSpecificMemory) return null;
      try {
        const measured = await performance.measureUserAgentSpecificMemory();
        return { bytes: measured.bytes };
      } catch (error) {
        return { error: String(error) };
      }
    });
    const shot = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05', 'screenshots', 'psp-gameplay.png');
    await page.screenshot({ path: shot, fullPage: true });
    await browser.close();

    const browser2 = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    try {
      const page2 = await browser2.newPage({ viewport: { width: 1280, height: 900 } });
      await page2.goto(`http://127.0.0.1:${port}/`);
      const restartCaps = await Promise.race([
        page2.evaluate(() => window.result),
        page2.waitForTimeout(120000).then(() => {
          throw new Error('PSP restart ready timed out');
        }),
      ]);
      if (!restartCaps.capabilities?.seekableMedia) throw new Error('PSP restart lost seekable media');
      await page2.waitForTimeout(2500);
      await page2.context().setOffline(true);
      const frame2 = page2.locator('#game');
      const restarted = greenDotCenter(PNG.sync.read(await frame2.screenshot()));
      await page2.evaluate(() => window.input(6, 1));
      await page2.waitForTimeout(900);
      await page2.evaluate(() => window.input(6, 0));
      const afterRestartMove = greenDotCenter(PNG.sync.read(await frame2.screenshot()));
      if (!(afterRestartMove.x < restarted.x - 10)) {
        throw new Error(`PSP fresh-browser left input failed: ${restarted.x} -> ${afterRestartMove.x}`);
      }
      console.log(
        `PSP_GAMEPLAY_PASS ${JSON.stringify({
          capabilities: result.capabilities,
          isolation,
          seekable,
          stateBytes: state.byteLength,
          before,
          moved,
          restored,
          restarted,
          afterRestartMove,
          processMemory: heap,
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
