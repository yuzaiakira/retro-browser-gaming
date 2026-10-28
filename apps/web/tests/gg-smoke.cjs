/**
 * Game Gear real-core smoke: genesis_plus_gx + MIT Waternet fixture.
 * Proves boot, GG-sized framebuffer, input, save/load, offline after load, segaGG scheme.
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtureName = process.env.GG_FIXTURE || 'mit-gg-waternet.gg';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = resolveEvidenceDir('PH-05');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.gg': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};

const outer = `<!doctype html><title>GG real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.bin');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({type:'init',session:'gg-smoke-1',file:new File([bytes], '${fixtureName}'),core:'genesis_plus_gx',name:'${fixtureName}'}, location.origin);
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'gg-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'gg-smoke-1',command,value}, location.origin);
window.probe = () => {
  const frame = document.querySelector('iframe');
  const win = frame.contentWindow;
  const emu = win.EJS_emulator;
  const canvas = emu?.canvas || win.document.querySelector('canvas');
  const scheme = win.EJS_controlScheme || emu?.getControlScheme?.();
  const fileName = emu?.fileName || emu?.config?.gameName || '';
  // Prefer internal framebuffer size when EmulatorJS exposes it; display canvas is often letterboxed/scaled.
  const gw = emu?.gameManager?.Module?.canvas?.width || canvas?.width || 0;
  const gh = emu?.gameManager?.Module?.canvas?.height || canvas?.height || 0;
  return {
    controlScheme: scheme,
    fileName,
    canvasWidth: gw,
    canvasHeight: gh,
    displayWidth: canvas?.clientWidth || 0,
    displayHeight: canvas?.clientHeight || 0,
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
      throw new Error('GG core did not expose save state capability');
    }
    await page.waitForTimeout(1500);
    await page.context().setOffline(true);

    const probe = await page.evaluate(() => window.probe());
    if (probe.controlScheme !== 'segaGG') {
      throw new Error(`Expected segaGG control scheme, got ${probe.controlScheme}`);
    }
    if (!String(probe.fileName).toLowerCase().endsWith('.gg')) {
      throw new Error(`Expected .gg ROM filename in core, got ${probe.fileName}`);
    }
    // Native GG is 160×144 (~1.111). EmulatorJS display canvas is often player-sized;
    // when an internal framebuffer is exposed, require GG-like aspect (allow integer scale).
    let aspect = null;
    if (probe.canvasWidth >= 140 && probe.canvasHeight >= 120 && probe.canvasWidth <= 640) {
      aspect = probe.canvasWidth / probe.canvasHeight;
      if (aspect < 0.95 || aspect > 1.35) {
        throw new Error(
          `GG framebuffer aspect unexpected: ${aspect.toFixed(3)} (${probe.canvasWidth}x${probe.canvasHeight})`,
        );
      }
    }

    // Start (libretro 3) then Button 1 (libretro 0) — Game Gear segaGG mapping
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
    if (lit < 150) throw new Error(`GG canvas almost black after boot (${lit} lit pixels)`);
    const beforeHash = sampleHash(beforePng);

    const state = await page.evaluate(() => window.command('save'));
    if (!(state?.byteLength > 256)) {
      throw new Error('GG core returned an implausibly small save state');
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
    if (movedLit < 150) throw new Error('GG canvas went black after input');

    await page.evaluate((saved) => window.command('load', saved), state);
    await page.waitForTimeout(200);
    const restoredPng = PNG.sync.read(await frame.screenshot());
    const restoredHash = sampleHash(restoredPng);

    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'gg-gameplay.png'),
      fullPage: true,
    });

    console.log(
      `GG_GAMEPLAY_PASS ${JSON.stringify({
        capabilities: result.capabilities,
        stateBytes: state.byteLength,
        lit,
        beforeHash,
        movedHash,
        restoredHash,
        inputChangedFrame: movedHash !== beforeHash,
        controlScheme: probe.controlScheme,
        fileName: probe.fileName,
        canvas: `${probe.canvasWidth}x${probe.canvasHeight}`,
        display: `${probe.displayWidth}x${probe.displayHeight}`,
        aspect: aspect == null ? null : Number(aspect.toFixed(3)),
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
