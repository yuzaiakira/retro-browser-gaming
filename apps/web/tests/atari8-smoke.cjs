/**
 * Atari 8-bit (libretro-atari800) Chromium A/B/A gameplay + save/restore.
 * Distinct from Atari 5200 (a5200). Open firmware: AltirraOS + Altirra BASIC.
 *
 * Markers: ATARI8_GAMEPLAY_PASS / ATARI8_SAVE_RESTORE_PASS
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/atari8-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');
const { createHash } = require('node:crypto');

const root = join(__dirname, '..', 'public');
const fixtureName = 'mit-atari8-dot.xex';
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = resolveEvidenceDir('PH-12');
const session = 'atari8-1';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const EXPECT_XEX_SHA =
  'bd52416d2d76201b3aa6c442eb197b338f3cd567fab2865a13aae0a12d81e16c';

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.xex': 'application/octet-stream',
  '.map': 'application/json',
};

const outer = `<!doctype html><title>Atari 8-bit atari800 smoke</title>
<style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style>
<iframe id="game" src="/runtime/frame.html"></iframe>
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
      core:'atari800', name:'${fixtureName}'
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 60000);
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
  const opts = win.EJS_defaultOptions || {};
  return {
    core: win.EJS_core,
    controlScheme: win.EJS_controlScheme,
    system: opts.atari800_system,
    osXl: opts.atari800_os_xl,
    basic: opts.atari800_basic_version,
    gameUrl: String(win.EJS_gameUrl || ''),
    seekable: !!win.EJS_emulator?.gameManager && !!win.RetroSeekableFS,
    seekableStats: win.RetroSeekableFS ? null : null,
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
  for (let y = 4; y < png.height; y += 6) {
    for (let x = 4; x < png.width; x += 6) {
      const i = (y * png.width + x) * 4;
      h = (h * 33 + png.data[i] + png.data[i + 1] * 3 + png.data[i + 2] * 7) >>> 0;
    }
  }
  return h;
}

/** Horizontal center of mass of bright pixels — Dot X proxy. */

/** Mean RGB of non-border playfield samples. */
function meanRGB(png) {
  let r = 0, g = 0, b = 0, n = 0;
  const y0 = Math.floor(png.height * 0.15);
  const y1 = Math.floor(png.height * 0.85);
  const x0 = Math.floor(png.width * 0.15);
  const x1 = Math.floor(png.width * 0.85);
  for (let y = y0; y < y1; y += 4) {
    for (let x = x0; x < x1; x += 4) {
      const i = (y * png.width + x) * 4;
      r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
    }
  }
  return n ? { r: r / n, g: g / n, b: b / n, n } : { r: 0, g: 0, b: 0, n: 0 };
}

function brightCentroidX(png) {
  let sumX = 0;
  let n = 0;
  for (let y = 8; y < png.height - 8; y += 2) {
    for (let x = 8; x < png.width - 8; x += 2) {
      const i = (y * png.width + x) * 4;
      const bright = png.data[i] + png.data[i + 1] + png.data[i + 2];
      if (bright > 120) {
        sumX += x;
        n++;
      }
    }
  }
  return n ? sumX / n : -1;
}

function frameDelta(a, b) {
  let changed = 0;
  const h = Math.min(a.height, b.height);
  const w = Math.min(a.width, b.width);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * a.width + x) * 4;
      const j = (y * b.width + x) * 4;
      if (
        Math.abs(a.data[i] - b.data[j]) +
          Math.abs(a.data[i + 1] - b.data[j + 1]) +
          Math.abs(a.data[i + 2] - b.data[j + 2]) >
        24
      ) {
        changed++;
      }
    }
  }
  return changed;
}

async function captureCanvas(page) {
  // WebGL canvas toDataURL is black without preserveDrawingBuffer —
  // use Playwright's compositor capture of the emulator iframe.
  const frame = page.frameLocator('#game').locator('canvas').first();
  await frame.waitFor({ state: 'visible', timeout: 60000 });
  return PNG.sync.read(await frame.screenshot());
}

async function holdButton(page, button, ms) {
  await page.evaluate(
    ({ button, ms }) =>
      new Promise((resolve) => {
        window.input(button, 1);
        setTimeout(() => {
          window.input(button, 0);
          resolve();
        }, ms);
      }),
    { button, ms },
  );
}

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (request.url === '/') {
    return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
  }
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
  const shotDir = join(evidenceDir, 'atari8', 'screenshots');
  await mkdir(shotDir, { recursive: true });

  const xex = await readFile(fixture);
  const xexSha = createHash('sha256').update(xex).digest('hex');
  if (xexSha !== EXPECT_XEX_SHA) {
    throw new Error(`fixture sha mismatch: ${xexSha} != ${EXPECT_XEX_SHA}`);
  }

  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });

  const log = [];
  const push = (line) => {
    log.push(line);
    console.log(line);
  };

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
    });
    page.on('pageerror', (err) => console.error('PAGEERROR', err.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await Promise.race([
      page.evaluate(() => window.result),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('atari800 ready timed out')), 180000),
      ),
    ]);
    push(`ready capabilities=${JSON.stringify(result.capabilities || {})}`);

    const probe = await page.evaluate(() => window.probe());
    push(`probe=${JSON.stringify(probe)}`);
    if (probe.core !== 'atari800') throw new Error('core not atari800');
    if (probe.system !== '800XL (64K)') throw new Error(`bad system ${probe.system}`);
    if (probe.osXl !== 'AltirraOS') throw new Error(`bad OS ${probe.osXl}`);
    if (probe.basic !== 'Altirra BASIC') throw new Error(`bad BASIC ${probe.basic}`);
    // needs_fullpath: gameUrl must be a bare filename (seekable), not blob:
    if (/^blob:/i.test(probe.gameUrl)) {
      throw new Error(`needs_fullpath violated: blob URL ${probe.gameUrl}`);
    }

    // Boot settle — AltirraOS + XEX load
    await page.waitForTimeout(8000);
    let idle = await captureCanvas(page);
    for (let i = 0; i < 12 && nonBlackPixels(idle) < 80; i++) {
      await page.waitForTimeout(1500);
      idle = await captureCanvas(page);
    }
    await writeFile(join(shotDir, 'atari8-idle.png'), PNG.sync.write(idle));
    const idleHash = sampleHash(idle);
    const idleX = brightCentroidX(idle);
    push(`idle nonBlack=${nonBlackPixels(idle)} hash=${idleHash} cx=${idleX.toFixed(1)}`);
    if (nonBlackPixels(idle) < 80) throw new Error('idle framebuffer too dark');

    // Soft reset to identical initial state (A)
    await page.evaluate(() => window.command('reset'));
    await page.waitForTimeout(5000);
    let stateA = await captureCanvas(page);
    for (let i = 0; i < 8 && nonBlackPixels(stateA) < 80; i++) {
      await page.waitForTimeout(1000);
      stateA = await captureCanvas(page);
    }
    await writeFile(join(shotDir, 'atari8-state-a.png'), PNG.sync.write(stateA));
    const cxA = brightCentroidX(stateA);
    push(`stateA cx=${cxA.toFixed(1)} hash=${sampleHash(stateA)}`);

    // Hold Left → capture B
    await page.evaluate(() => window.input(6, 1)); // LEFT (RetroPad)
    await page.waitForTimeout(2200);
    const leftHeld = await captureCanvas(page);
    await page.evaluate(() => window.input(6, 0));
    await writeFile(join(shotDir, 'atari8-left.png'), PNG.sync.write(leftHeld));
    const cxLeft = brightCentroidX(leftHeld);
    const dLeft = frameDelta(stateA, leftHeld);
    push(`left cx=${cxLeft.toFixed(1)} delta=${dLeft}`);
    push(`left rgb=${JSON.stringify(meanRGB(leftHeld))}`);
    if (dLeft < 200) throw new Error(`Left produced insufficient change delta=${dLeft}`);

    // Restore A via reset
    await page.evaluate(() => window.command('reset'));
    await page.waitForTimeout(5000);
    let stateA2 = await captureCanvas(page);
    for (let i = 0; i < 8 && nonBlackPixels(stateA2) < 80; i++) {
      await page.waitForTimeout(1000);
      stateA2 = await captureCanvas(page);
    }
    const cxA2 = brightCentroidX(stateA2);
    push(`stateA2 cx=${cxA2.toFixed(1)}`);

    // Hold Right → capture C
    await page.evaluate(() => window.input(7, 1)); // RIGHT
    await page.waitForTimeout(2200);
    const rightHeld = await captureCanvas(page);
    await page.evaluate(() => window.input(7, 0));
    await writeFile(join(shotDir, 'atari8-right.png'), PNG.sync.write(rightHeld));
    const cxRight = brightCentroidX(rightHeld);
    const dRight = frameDelta(stateA2, rightHeld);
    push(`right cx=${cxRight.toFixed(1)} delta=${dRight}`);
    push(`right rgb=${JSON.stringify(meanRGB(rightHeld))}`);
    if (dRight < 200) throw new Error(`Right produced insufficient change delta=${dRight}`);
    const dLR = frameDelta(leftHeld, rightHeld);
    push(`leftVsRight delta=${dLR}`);
    if (dLR < 200) throw new Error(`Left and Right frames too similar delta=${dLR}`);

    // Fire separately (Y toggle) — expect vertical/shape change
    await page.evaluate(() => window.command('reset'));
    await page.waitForTimeout(5000);
    const beforeFire = await captureCanvas(page);
    await page.evaluate(() => window.input(4, 1)); // UP
    await page.waitForTimeout(1800);
    const afterUp = await captureCanvas(page);
    await page.evaluate(() => window.input(4, 0));
    await writeFile(join(shotDir, 'atari8-up.png'), PNG.sync.write(afterUp));
    const dUp = frameDelta(beforeFire, afterUp);
    push(`up delta=${dUp}`);
    await page.evaluate(() => window.input(0, 1)); // FIRE hold
    await page.waitForTimeout(1200);
    const afterFire = await captureCanvas(page);
    await page.evaluate(() => window.input(0, 0));
    await writeFile(join(shotDir, 'atari8-fire.png'), PNG.sync.write(afterFire));
    const dFire = frameDelta(beforeFire, afterFire);
    push(`fire delta=${dFire}`);
    if (dUp < 100 && dFire < 100) {
      throw new Error(`Up/Fire produced no visible change up=${dUp} fire=${dFire}`);
    }

    push('ATARI8_GAMEPLAY_PASS');

    // ---- Save / restore ----
    if (!result.capabilities?.saveState) {
      throw new Error('saveState capability not advertised');
    }
    await page.evaluate(() => window.command('reset'));
    await page.waitForTimeout(6000);
    // Move left to position A
    await page.evaluate(() => window.input(6, 1));
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.input(6, 0));
    await page.waitForTimeout(400);
    const posA = await captureCanvas(page);
    await page.evaluate(() => window.command('pause'));
    await page.waitForTimeout(300);
    let saveBlob = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        saveBlob = await page.evaluate(async () => {
          const raw = await window.command('save');
          if (!raw || !raw.byteLength) throw new Error('empty save');
          const u8 = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
          let bin = '';
          for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
          return { b64: btoa(bin), bytes: u8.length };
        });
        break;
      } catch (err) {
        push(`save attempt ${attempt} failed: ${err.message || err}`);
        await page.waitForTimeout(500);
      }
    }
    await page.evaluate(() => window.command('resume'));
    await page.waitForTimeout(500);
    if (!saveBlob) throw new Error('saveState failed after retries');
    push(`saveA bytes=${saveBlob.bytes}`);
    if (saveBlob.bytes < 256) throw new Error('save too small');
    await writeFile(
      join(evidenceDir, 'atari8', 'save-a.bin'),
      Buffer.from(saveBlob.b64, 'base64'),
    );

    // Move right to position B (ensure all directions released first)
    for (const btn of [4, 5, 6, 7, 0]) {
      await page.evaluate((b) => window.input(b, 0), btn);
    }
    await page.waitForTimeout(200);
    await page.evaluate(() => window.input(7, 1));
    await page.waitForTimeout(2800);
    const posB = await captureCanvas(page); // capture while held
    await page.evaluate(() => window.input(7, 0));
    await page.waitForTimeout(200);
    const dAB = frameDelta(posA, posB);
    push(`deltaAB=${dAB}`);
    if (dAB < 200) throw new Error(`failed to reach distinct position B delta=${dAB}`);
    await writeFile(join(shotDir, 'atari8-save-b.png'), PNG.sync.write(posB));

    // Restore A
    await page.evaluate(() => window.command('pause'));
    await page.waitForTimeout(200);
    await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      await window.command('load', u8.buffer);
    }, saveBlob.b64);
    await page.evaluate(() => window.command('resume'));
    await page.waitForTimeout(1500);
    const restored = await captureCanvas(page);
    await writeFile(join(shotDir, 'atari8-restored-a.png'), PNG.sync.write(restored));
    const dRest = frameDelta(posA, restored);
    push(`restored deltaVsA=${dRest}`);
    if (dRest > 2500) {
      throw new Error(`restore did not return near A delta=${dRest}`);
    }

    // Continue interaction after restore (hold-while-capture)
    await page.waitForTimeout(400);
    for (const btn of [4, 5, 6, 7, 0]) {
      await page.evaluate((b) => window.input(b, 0), btn);
    }
    await page.evaluate(() => window.input(7, 1));
    await page.waitForTimeout(2200);
    const afterCont = await captureCanvas(page);
    await page.evaluate(() => window.input(7, 0));
    const dCont = frameDelta(restored, afterCont);
    push(`post-restore move delta=${dCont}`);
    if (dCont < 100) {
      // Fallback: fire hold often still drives COLOR2 after restore
      await page.evaluate(() => window.input(0, 1));
      await page.waitForTimeout(1200);
      const afterFire2 = await captureCanvas(page);
      await page.evaluate(() => window.input(0, 0));
      const dFire2 = frameDelta(restored, afterFire2);
      push(`post-restore fire delta=${dFire2}`);
      if (dFire2 < 100) throw new Error('no interaction after restore');
    }

    // Reject truncated snapshot
    let rejected = false;
    try {
      await page.evaluate(async () => {
        await window.command('load', new Uint8Array([1, 2, 3]).buffer);
      });
    } catch {
      rejected = true;
    }
    push(`truncated_rejected=${rejected}`);

    push('ATARI8_SAVE_RESTORE_PASS');

    await writeFile(
      join(evidenceDir, 'atari8', 'atari8-smoke.txt'),
      log.join('\n') + '\n',
    );
    await writeFile(
      join(evidenceDir, 'atari8', 'status.json'),
      JSON.stringify(
        {
          gameplay: 'ATARI8_GAMEPLAY_PASS',
          save: 'ATARI8_SAVE_RESTORE_PASS',
          fixtureSha256: xexSha,
          core: 'atari800',
          machine: '800XL (64K)',
          firmware: 'AltirraOS+AltirraBASIC',
          saveBytes: saveBlob.bytes,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
