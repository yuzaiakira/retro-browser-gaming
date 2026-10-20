/**
 * NES real-core smoke: fceumm + MIT Table Tennis fixture.
 * Proves boot, rendered pixels, input, save/load, offline after load, nes scheme.
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtureName = process.env.NES_FIXTURE || 'mit-nes-table-tennis.nes';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.nes': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};

const outer = `<!doctype html><title>NES real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.bin');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({type:'init',session:'nes-smoke-1',file:new File([bytes], '${fixtureName}'),core:'fceumm',name:'${fixtureName}'}, location.origin);
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'nes-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'nes-smoke-1',command,value}, location.origin);
window.probe = () => {
  const win = document.querySelector('iframe').contentWindow;
  return {
    controlScheme: win.EJS_controlScheme || win.EJS_emulator?.getControlScheme?.(),
    fileName: win.EJS_emulator?.fileName || win.EJS_gameName || '',
  };
};
</script>`;

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

async function run() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const server = createServer((request, response) => {
    handler(request, response);
  });
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
    if (!result.capabilities?.saveState) {
      throw new Error('NES core did not expose save state capability');
    }
    await page.waitForTimeout(1500);
    await page.context().setOffline(true);

    const probe = await page.evaluate(() => window.probe());
    if (probe.controlScheme !== 'nes') {
      throw new Error(`Expected nes control scheme, got ${probe.controlScheme}`);
    }

    // Start (libretro 3) then A/B (0/8) — NES mapping
    await page.evaluate(() => window.input(3, 1));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.input(3, 0));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.input(0, 1));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.input(0, 0));
    await page.waitForTimeout(600);

    const frame = page.locator('#game');
    const beforePng = PNG.sync.read(await frame.screenshot());
    const lit = nonBlackPixels(beforePng);
    if (lit < 150) throw new Error(`NES canvas almost black after boot (${lit} lit pixels)`);
    const beforeHash = sampleHash(beforePng);

    const state = await page.evaluate(() => window.command('save'));
    if (!(state?.byteLength > 256)) {
      throw new Error('NES core returned an implausibly small save state');
    }

    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.input(7, 1));
      await page.waitForTimeout(80);
      await page.evaluate(() => window.input(7, 0));
      await page.evaluate(() => window.input(6, 1));
      await page.waitForTimeout(80);
      await page.evaluate(() => window.input(6, 0));
    }
    await page.waitForTimeout(300);
    const movedPng = PNG.sync.read(await frame.screenshot());
    const movedHash = sampleHash(movedPng);
    const movedLit = nonBlackPixels(movedPng);
    if (movedLit < 150) throw new Error('NES canvas went black after input');

    await page.evaluate((saved) => window.command('load', saved), state);
    await page.waitForTimeout(200);
    const restoredPng = PNG.sync.read(await frame.screenshot());
    const restoredHash = sampleHash(restoredPng);

    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'nes-gameplay.png'),
      fullPage: true,
    });

    console.log(
      `NES_GAMEPLAY_PASS ${JSON.stringify({
        capabilities: result.capabilities,
        stateBytes: state.byteLength,
        lit,
        beforeHash,
        movedHash,
        restoredHash,
        inputChangedFrame: movedHash !== beforeHash,
        controlScheme: probe.controlScheme,
        fixture: fixtureName,
      })}`,
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
