/**
 * N64 interactive input diagnostic (PH-12.1).
 * USB64 controller-test only shows LIVE input; capture while held.
 */
const { createServer } = require('http');
const { readFile, mkdir, writeFile } = require('fs/promises');
const { join, extname, normalize } = require('path');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const fixtureName = 'mit-n64-controller-test.z64';
const root = join(__dirname, '..', 'public');
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = join(__dirname, '..', '..', '..', '.runtime', 'test-evidence', 'PH-12', 'n64');
const session = 'n64-diag-1';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.z64': 'application/octet-stream',
};

const outer = `<!doctype html><title>N64 input diag</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.bin');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({type:'init',session:'${session}',file:new File([bytes], '${fixtureName}'),core:'mupen64plus_next',name:'${fixtureName}'}, location.origin);
  }, { once: true });
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'${session}',command,value}, location.origin);
window.probe = () => {
  const win = document.querySelector('iframe').contentWindow;
  const gm = win.EJS_emulator?.gameManager;
  return {
    controlScheme: win.EJS_controlScheme || win.EJS_emulator?.getControlScheme?.(),
    hasSimulate: typeof gm?.simulateInput === 'function',
    started: !!win.EJS_emulator,
  };
};
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
  let d = 0;
  for (let i = 0; i < n; i += 4) {
    d += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return d;
}

async function shot(page, name) {
  const frame = page.locator('#game');
  const buf = await frame.screenshot();
  const png = PNG.sync.read(buf);
  await writeFile(join(evidenceDir, 'screenshots', name), buf);
  return png;
}

async function run() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const server = createServer(async (request, response) => {
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
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  const results = { trials: [] };
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    const ready = await page.evaluate(() => window.result);
    results.ready = ready;
    await page.waitForTimeout(6000);
    const probe = await page.evaluate(() => window.probe());
    results.probe = probe;
    const boot = await shot(page, 'diag-boot.png');
    results.boot = { lit: nonBlackPixels(boot), hash: sampleHash(boot) };

    const trials = [
      { name: 'hold-A', apply: async () => { await page.evaluate(() => window.input(0, 1)); } , release: async () => { await page.evaluate(() => window.input(0, 0)); } },
      { name: 'hold-Start', apply: async () => { await page.evaluate(() => window.input(3, 1)); } , release: async () => { await page.evaluate(() => window.input(3, 0)); } },
      { name: 'hold-Dpad-Right', apply: async () => { await page.evaluate(() => window.input(7, 1)); } , release: async () => { await page.evaluate(() => window.input(7, 0)); } },
      { name: 'hold-stick-right-pos', apply: async () => { await page.evaluate(() => window.input(16, 0x7fff)); } , release: async () => { await page.evaluate(() => window.input(16, 0)); } },
      { name: 'hold-stick-left-neg', apply: async () => { await page.evaluate(() => window.input(17, -0x7fff)); } , release: async () => { await page.evaluate(() => window.input(17, 0)); } },
      { name: 'hold-stick-left-pos', apply: async () => { await page.evaluate(() => window.input(17, 0x7fff)); } , release: async () => { await page.evaluate(() => window.input(17, 0)); } },
      { name: 'hold-stick-up-neg', apply: async () => { await page.evaluate(() => window.input(19, -0x7fff)); } , release: async () => { await page.evaluate(() => window.input(19, 0)); } },
      { name: 'hold-Z', apply: async () => { await page.evaluate(() => window.input(12, 1)); } , release: async () => { await page.evaluate(() => window.input(12, 0)); } },
      { name: 'hold-C-right', apply: async () => { await page.evaluate(() => window.input(20, 0x7fff)); } , release: async () => { await page.evaluate(() => window.input(20, 0)); } },
      // RetroPad A=8 (non-n64 scheme) — sanity if scheme wrong
      { name: 'hold-RetroPad-A8', apply: async () => { await page.evaluate(() => window.input(8, 1)); } , release: async () => { await page.evaluate(() => window.input(8, 0)); } },
    ];

    for (const t of trials) {
      await t.apply();
      await page.waitForTimeout(500);
      const held = await shot(page, `diag-${t.name}.png`);
      const delta = frameDelta(boot, held);
      const hash = sampleHash(held);
      const lit = nonBlackPixels(held);
      const changed = hash !== results.boot.hash || delta >= 40;
      results.trials.push({ name: t.name, changed, delta, hash, lit });
      console.log(JSON.stringify({ name: t.name, changed, delta, hash, lit }));
      await t.release();
      await page.waitForTimeout(200);
    }

    // Direct WASM call from inside iframe (bypass postMessage)
    const direct = await page.evaluate(async () => {
      const win = document.querySelector('iframe').contentWindow;
      const gm = win.EJS_emulator?.gameManager;
      if (!gm?.simulateInput) return { ok: false, reason: 'no simulateInput' };
      gm.simulateInput(0, 0, 1); // A
      await new Promise((r) => setTimeout(r, 400));
      return { ok: true };
    });
    const directPng = await shot(page, 'diag-direct-A.png');
    results.directA = {
      ...direct,
      delta: frameDelta(boot, directPng),
      hash: sampleHash(directPng),
      changed: sampleHash(directPng) !== results.boot.hash || frameDelta(boot, directPng) >= 40,
    };
    console.log(JSON.stringify({ name: 'direct-A', ...results.directA }));
    await page.evaluate(() => {
      document.querySelector('iframe').contentWindow.EJS_emulator?.gameManager?.simulateInput(0, 0, 0);
    });

    const any = results.trials.some((t) => t.changed) || results.directA.changed;
    results.verdict = any ? 'INPUT_REACHES_FRAMEBUFFER' : 'INPUT_NO_FRAMEBUFFER_DELTA';
    await writeFile(join(evidenceDir, 'input-diag.json'), JSON.stringify(results, null, 2));
    console.log('VERDICT ' + results.verdict);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
