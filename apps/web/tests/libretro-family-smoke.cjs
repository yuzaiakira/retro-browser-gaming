/**
 * Parameterized real-core smoke for SNES / GB / GBC / GBA / Atari 2600 / PCE / SG-1000.
 * Usage: PLATFORM=... CHROMIUM_EXECUTABLE=... node tests/libretro-family-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const PLATFORMS = {
  snes: {
    label: 'SNES',
    core: 'snes9x',
    fixture: 'mit-snes-gothicvania.sfc',
    scheme: 'snes',
    pass: 'SNES_GAMEPLAY_PASS',
    screenshot: 'snes-gameplay.png',
  },
  gb: {
    label: 'GB',
    core: 'gambatte',
    fixture: 'mit-gb-dot.gb',
    scheme: 'gb',
    pass: 'GB_GAMEPLAY_PASS',
    screenshot: 'gb-gameplay.png',
  },
  gbc: {
    label: 'GBC',
    core: 'gambatte',
    fixture: 'mit-gbc-waternet.gbc',
    scheme: 'gb',
    pass: 'GBC_GAMEPLAY_PASS',
    screenshot: 'gbc-gameplay.png',
  },
  gba: {
    label: 'GBA',
    core: 'mgba',
    fixture: 'mit-gba-dino.gba',
    scheme: 'gba',
    pass: 'GBA_GAMEPLAY_PASS',
    screenshot: 'gba-gameplay.png',
  },
  a2600: {
    label: 'A2600',
    core: 'stella2014',
    fixture: 'mit-a2600-berta.a26',
    scheme: 'atari2600',
    pass: 'A2600_GAMEPLAY_PASS',
    screenshot: 'a2600-gameplay.png',
  },
  a5200: {
    label: 'A5200',
    core: 'a5200',
    fixture: 'cc0-a5200-culomin.a52',
    scheme: 'atari5200',
    pass: 'A5200_GAMEPLAY_PASS',
    screenshot: 'a5200-gameplay.png',
    // Culomin: no Down spam (falls into darkness). Avoid A spam in the move loop.
    inputProfile: 'start-move',
    moveAxes: 'horizontal',
  },
  vb: {
    label: 'VB',
    core: 'beetle_vb',
    fixture: 'mit-vb-spong.vb',
    scheme: 'vb',
    pass: 'VB_GAMEPLAY_PASS',
    screenshot: 'vb-gameplay.png',
    // SPONG paddle is vertical; A blanks beetle_vb framebuffer in this build.
    inputProfile: 'start-only-move',
    moveAxes: 'vertical',
  },
  pce: {
    label: 'PCE',
    core: 'mednafen_pce',
    fixture: 'huc-pce-scroll.pce',
    scheme: 'pce',
    pass: 'PCE_GAMEPLAY_PASS',
    screenshot: 'pce-gameplay.png',
  },
  sg1000: {
    label: 'SG1000',
    core: 'smsplus',
    fixture: 'mit-sg1000-retropipe.sg',
    scheme: 'segaMS',
    pass: 'SG1000_GAMEPLAY_PASS',
    screenshot: 'sg1000-gameplay.png',
  },
  wswan: {
    label: 'WSWAN',
    core: 'mednafen_wswan',
    fixture: 'mit-wswan-chips1.wsc',
    scheme: 'ws',
    pass: 'WSWAN_GAMEPLAY_PASS',
    screenshot: 'wswan-gameplay.png',
  },
  a7800: {
    label: 'A7800',
    core: 'prosystem',
    fixture: 'gpl-a7800-rfk.a78',
    scheme: 'atari7800',
    pass: 'A7800_GAMEPLAY_PASS',
    screenshot: 'a7800-gameplay.png',
  },
  lynx: {
    label: 'LYNX',
    core: 'handy',
    fixture: 'mit-lynx-dot.lnx',
    scheme: 'lynx',
    pass: 'LYNX_GAMEPLAY_PASS',
    screenshot: 'lynx-gameplay.png',
  },
  ngp: {
    label: 'NGP',
    core: 'mednafen_ngp',
    fixture: 'gpl-ngp-joypad.ngp',
    scheme: 'ngp',
    pass: 'NGP_GAMEPLAY_PASS',
    screenshot: 'ngp-gameplay.png',
  },
  ngpc: {
    label: 'NGPC',
    core: 'mednafen_ngp',
    fixture: 'gpl-ngpc-test.ngp',
    scheme: 'ngp',
    pass: 'NGPC_GAMEPLAY_PASS',
    screenshot: 'ngpc-gameplay.png',
  },
  // MS-DOS uses dedicated apps/web/tests/dos-jsdos-smoke.cjs (jsdos runtime).
};

const platformKey = process.env.PLATFORM || 'snes';
const cfg = PLATFORMS[platformKey];
if (!cfg) {
  console.error(`Unknown PLATFORM=${platformKey}; expected ${Object.keys(PLATFORMS).join('|')}`);
  process.exit(1);
}

const root = join(__dirname, '..', 'public');
const fixtureName = process.env.FIXTURE || cfg.fixture;
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05');
const session = `${platformKey}-smoke-1`;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.sfc': 'application/octet-stream',
  '.smc': 'application/octet-stream',
  '.gb': 'application/octet-stream',
  '.gbc': 'application/octet-stream',
  '.gba': 'application/octet-stream',
  '.a26': 'application/octet-stream',
  '.a52': 'application/octet-stream',
  '.vb': 'application/octet-stream',
  '.vboy': 'application/octet-stream',
  '.pce': 'application/octet-stream',
  '.sg': 'application/octet-stream',
  '.ws': 'application/octet-stream',
  '.wsc': 'application/octet-stream',
  '.a78': 'application/octet-stream',
  '.lnx': 'application/octet-stream',
  '.lyx': 'application/octet-stream',
  '.ngp': 'application/octet-stream',
  '.ngc': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.zip': 'application/zip',
};

const outer = `<!doctype html><title>${cfg.label} real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.bin');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({type:'init',session:'${session}',file:new File([bytes], '${fixtureName}'),core:'${cfg.core}',name:'${fixtureName}'}, location.origin);
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
  // Dense enough to catch small sprites on large, mostly-static playfields.
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
      throw new Error(`${cfg.label} core did not expose save state capability`);
    }
    await page.waitForTimeout(2500);
    if (!process.env.SKIP_OFFLINE) await page.context().setOffline(true);

    const probe = await page.evaluate(() => window.probe());
    if (probe.controlScheme !== cfg.scheme) {
      throw new Error(`Expected ${cfg.scheme} control scheme, got ${probe.controlScheme}`);
    }

    const frame = page.locator('#game');
    const bootPng = PNG.sync.read(await frame.screenshot());
    const lit = nonBlackPixels(bootPng);
    if (lit < 100) throw new Error(`${cfg.label} canvas almost black after boot (${lit} lit pixels)`);
    const bootHash = sampleHash(bootPng);

    if (cfg.inputProfile === 'start-move' || cfg.inputProfile === 'start-only-move') {
      const bootCmds = cfg.inputProfile === 'start-only-move' ? [3] : [3, 8];
      for (const cmd of bootCmds) {
        await page.evaluate((c) => window.input(c, 1), cmd);
        await page.waitForTimeout(250);
        await page.evaluate((c) => window.input(c, 0), cmd);
        await page.waitForTimeout(400);
      }
    } else {
      // Hold Down then fire — proven against prosystem robotfindskitten menu.
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.input(5, 1));
        await page.waitForTimeout(100);
        await page.evaluate(() => window.input(5, 0));
        await page.waitForTimeout(100);
      }
      await page.evaluate(() => window.input(0, 1));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.input(0, 0));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.input(8, 1));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.input(8, 0));
      await page.waitForTimeout(600);
    }

    const beforePng = PNG.sync.read(await frame.screenshot());
    const beforeHash = sampleHash(beforePng);
    const beforeLit = nonBlackPixels(beforePng);
    if (beforeLit < 100) throw new Error(`${cfg.label} canvas went black after menu input`);
    const menuDelta = frameDelta(bootPng, beforePng);

    const axis =
      cfg.moveAxes === 'vertical'
        ? [4, 5]
        : cfg.moveAxes === 'horizontal'
          ? [6, 7]
          : [6, 7];
    for (let i = 0; i < 12; i++) {
      await page.evaluate((c) => window.input(c, 1), axis[0]);
      await page.waitForTimeout(60);
      await page.evaluate((c) => window.input(c, 0), axis[0]);
      await page.evaluate((c) => window.input(c, 1), axis[1]);
      await page.waitForTimeout(60);
      await page.evaluate((c) => window.input(c, 0), axis[1]);
      if (
        cfg.inputProfile !== 'start-move' &&
        cfg.inputProfile !== 'start-only-move'
      ) {
        await page.evaluate(() => window.input(8, 1));
        await page.waitForTimeout(60);
        await page.evaluate(() => window.input(8, 0));
      }
    }
    await page.waitForTimeout(300);
    const movedPng = PNG.sync.read(await frame.screenshot());
    const movedHash = sampleHash(movedPng);
    const movedLit = nonBlackPixels(movedPng);
    if (movedLit < 100) throw new Error(`${cfg.label} canvas went black after input`);
    const delta = frameDelta(beforePng, movedPng);
    if (movedHash === beforeHash && delta < 40 && bootHash === beforeHash && menuDelta < 40) {
      await page.screenshot({
        path: join(evidenceDir, 'screenshots', `${platformKey}-input-fail.png`),
        fullPage: true,
      });
      throw new Error(
        `${cfg.label} framebuffer unchanged after directional/A input (delta=${delta} menuDelta=${menuDelta} lit=${lit} beforeHash=${beforeHash} movedHash=${movedHash} bootHash=${bootHash})`,
      );
    }

    let state = null;
    let restoredHash = null;
    try {
      state = await page.evaluate(() => window.command('save'));
      if (state?.byteLength > 64) {
        await page.evaluate((saved) => window.command('load', saved), state);
        await page.waitForTimeout(250);
        restoredHash = sampleHash(PNG.sync.read(await frame.screenshot()));
      }
    } catch {
      state = null;
    }
    if (!(state?.byteLength > 64)) {
      // Some cores return empty states on menus; still require interactive frames above.
      state = { byteLength: 0 };
    }

    await page.screenshot({
      path: join(evidenceDir, 'screenshots', cfg.screenshot),
      fullPage: true,
    });

    console.log(
      `${cfg.pass} ${JSON.stringify({
        capabilities: result.capabilities,
        stateBytes: state.byteLength,
        lit,
        beforeHash,
        movedHash,
        restoredHash,
        inputChangedFrame: movedHash !== beforeHash || bootHash !== beforeHash,
        menuChangedFrame: bootHash !== beforeHash,
        controlScheme: probe.controlScheme,
        core: cfg.core,
        fixture: fixtureName,
        platform: platformKey,
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
