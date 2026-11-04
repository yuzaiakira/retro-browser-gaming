/**
 * Dreamcast Flycast WASM — HLE boot + interactive Dot proof (no SEGA BIOS).
 *
 * Forces reicast_hle_bios=enabled and reicast_emulate_framebuffer=enabled.
 * Marker: DREAMCAST_GAMEPLAY_PASS
 *
 * Usage:
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/dreamcast-hle-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { createReadStream, existsSync } = require('node:fs');
const { join, normalize, extname } = require('node:path');
const { createHash } = require('node:crypto');
const { PNG } = require('pngjs');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');

const root = join(__dirname, '..', 'public');
const fixtureName = 'mit-dreamcast-dot.elf';
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-12');
const shotDir = join(evidenceDir, 'dreamcast', 'screenshots');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.elf': 'application/octet-stream',
};

const outer = `<!doctype html><title>Dreamcast Flycast HLE smoke</title>
<style>html,body{margin:0;width:100%;height:100%;background:#000}iframe{width:960px;height:720px;border:0;display:block;background:#000}</style>
<iframe id="game" src="/runtime/frame.html" allow="cross-origin-isolated"></iframe>
<script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') console.log('PARENT_ERR', event.data.error);
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.elf');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'dc-hle-1',
      file: new File([bytes], '${fixtureName}'),
      core: 'flycast',
      name: '${fixtureName}',
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'dc-hle-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'dc-hle-1',command,value}, location.origin);
window.snap = () => {
  const doc = document.querySelector('#game').contentDocument;
  doc.querySelectorAll('.ejs_menu_bar,.ejs_settings_parent,.ejs_virtualGamepad,.ejs_context_menu').forEach((el) => {
    el.style.display = 'none';
  });
  const c = doc.querySelector('canvas');
  const t = doc.createElement('canvas');
  t.width = c.width; t.height = c.height;
  t.getContext('2d').drawImage(c, 0, 0);
  return t.toDataURL('image/png');
};
window.frame = () => {
  try { return document.querySelector('#game').contentWindow.EJS_emulator.gameManager.functions.getFrameNum(); }
  catch { return -1; }
};
</script>`;

function fromDataUrl(url) {
  return PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));
}

function sampleHash(png) {
  return createHash('sha256').update(Buffer.from(png.data)).digest('hex').slice(0, 16);
}

/** Dot idle ~220,220,240; fire ~240,64,64; bg ~16,24,48. */
function dotStats(png) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  let fire = 0;
  const w = png.width;
  for (let i = 0, p = 0; i < png.data.length; i += 4, p++) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const isIdle = r > 180 && g > 180 && b > 180;
    const isFire = r > 180 && g < 120 && b < 120;
    if (isIdle || isFire) {
      sx += p % w;
      sy += (p / w) | 0;
      n++;
      if (isFire) fire++;
    }
  }
  return n ? { x: sx / n, y: sy / n, n, fire } : { x: 0, y: 0, n: 0, fire: 0 };
}

async function run() {
  if (!existsSync(fixture)) throw new Error(`missing fixture ${fixture}`);
  await mkdir(shotDir, { recursive: true });
  const fixtureSha = createHash('sha256').update(await readFile(fixture)).digest('hex');

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') {
      res.writeHead(200, {
        'content-type': 'text/html',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      });
      res.end(outer);
      return;
    }
    if (url.pathname === '/fixture.elf') {
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'Cross-Origin-Resource-Policy': 'same-origin',
      });
      createReadStream(fixture).pipe(res);
      return;
    }
    const path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    createReadStream(path)
      .on('open', () => {
        res.writeHead(200, {
          'content-type': types[extname(path)] || 'application/octet-stream',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        });
      })
      .on('error', () => {
        res.writeHead(404);
        res.end('missing');
      })
      .pipe(res);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-features=SharedArrayBuffer',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(300000);
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`PAGEERROR ${e.message}`));

  const status = {
    fixtureSha256: fixtureSha,
    core: 'flycast',
    hle: 'reicast_hle_bios=enabled',
    framebuffer: 'reicast_emulate_framebuffer=enabled',
    biosFilesPresent: false,
  };

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    const ready = await Promise.race([
      page.evaluate(() => window.result),
      new Promise((_, reject) => setTimeout(() => reject(new Error('flycast ready timed out')), 240000)),
    ]);
    status.ready = ready;
    status.capabilities = ready?.capabilities || null;
    console.log('DREAMCAST_HLE_READY', JSON.stringify(ready?.capabilities || {}));

    await page.waitForTimeout(10000);
    await page.locator('#game').click({ position: { x: 480, y: 360 } }).catch(() => {});
    await page.waitForTimeout(1000);

    const f0 = await page.evaluate(() => window.frame());
    const idlePng = fromDataUrl(await page.evaluate(() => window.snap()));
    const idle = dotStats(idlePng);
    status.idle = { ...idle, hash: sampleHash(idlePng) };
    await writeFile(join(shotDir, 'hle-idle.png'), PNG.sync.write(idlePng));

    if (idle.n < 100) {
      status.boot = 'DREAMCAST_HLE_BOOT_BLACK';
      console.log('DREAMCAST_HLE_BOOT_BLACK', JSON.stringify(idle));
      process.exitCode = 1;
    } else {
      status.boot = 'DREAMCAST_HLE_BOOT_VISIBLE';
      console.log('DREAMCAST_HLE_BOOT_VISIBLE', JSON.stringify(idle));

      await page.evaluate(() => window.input(6, 1));
      await page.waitForTimeout(2500);
      const leftPng = fromDataUrl(await page.evaluate(() => window.snap()));
      const left = dotStats(leftPng);
      await page.evaluate(() => window.input(6, 0));

      await page.evaluate(() => window.input(7, 1));
      await page.waitForTimeout(2500);
      const rightPng = fromDataUrl(await page.evaluate(() => window.snap()));
      const right = dotStats(rightPng);
      await page.evaluate(() => window.input(7, 0));

      status.left = { ...left, hash: sampleHash(leftPng) };
      status.right = { ...right, hash: sampleHash(rightPng) };
      status.movedLeft = left.n > 100 && left.x < idle.x - 8;
      status.movedRight = right.n > 100 && right.x > left.x + 8;
      await writeFile(join(shotDir, 'hle-left.png'), PNG.sync.write(leftPng));
      await writeFile(join(shotDir, 'hle-right.png'), PNG.sync.write(rightPng));

      // A button — try RetroPad A (8) then B (0).
      let fireOk = false;
      for (const btn of [8, 0, 1, 9]) {
        await page.evaluate((b) => window.input(b, 1), btn);
        await page.waitForTimeout(600);
        const fired = dotStats(fromDataUrl(await page.evaluate(() => window.snap())));
        await page.evaluate((b) => window.input(b, 0), btn);
        await page.waitForTimeout(400);
        if (fired.fire > 20) {
          fireOk = true;
          status.fireButton = btn;
          status.fire = fired;
          break;
        }
      }
      status.fireOk = fireOk;

      const f1 = await page.evaluate(() => window.frame());
      status.frames = [f0, f1];
      status.frameDelta = f1 - f0;

      // Save at left, move right, restore — position must return near left.
      await page.evaluate(() => window.input(6, 1));
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.input(6, 0));
      const savePos = dotStats(fromDataUrl(await page.evaluate(() => window.snap())));
      const state = await page.evaluate(() => window.command('save'));
      status.saveBytes = state?.byteLength || 0;
      await page.evaluate(() => window.input(7, 1));
      await page.waitForTimeout(2500);
      await page.evaluate(() => window.input(7, 0));
      const movedPos = dotStats(fromDataUrl(await page.evaluate(() => window.snap())));
      await page.evaluate((buf) => window.command('load', buf), state);
      await page.waitForTimeout(1500);
      const restored = dotStats(fromDataUrl(await page.evaluate(() => window.snap())));
      status.saveProbe = { savePos, movedPos, restored, saveBytes: status.saveBytes };
      status.saveRestore =
        status.saveBytes > 1024 &&
        Math.abs(movedPos.x - savePos.x) > 20 &&
        Math.abs(restored.x - savePos.x) < 30;
      if (status.saveRestore) {
        status.saveMarker = 'DREAMCAST_SAVE_RESTORE_PASS';
        console.log('DREAMCAST_SAVE_RESTORE_PASS', JSON.stringify(status.saveProbe));
      } else {
        status.saveMarker = 'DREAMCAST_SAVE_RESTORE_FAIL';
        console.log('DREAMCAST_SAVE_RESTORE_FAIL', JSON.stringify(status.saveProbe));
      }

      const gameplay =
        status.movedLeft && status.movedRight && status.frameDelta > 200 && idle.n > 100;
      if (gameplay) {
        status.gameplay = 'DREAMCAST_GAMEPLAY_PASS';
        console.log('DREAMCAST_GAMEPLAY_PASS');
      } else {
        status.gameplay = 'DREAMCAST_GAMEPLAY_INCONCLUSIVE';
        console.log('DREAMCAST_GAMEPLAY_INCONCLUSIVE', JSON.stringify(status));
        process.exitCode = 1;
      }
    }
  } catch (err) {
    status.boot = 'DREAMCAST_HLE_BOOT_FAIL';
    status.error = String(err && err.stack ? err.stack : err);
    console.error('DREAMCAST_HLE_BOOT_FAIL', err);
    process.exitCode = 1;
  } finally {
    status.consoleTail = consoleLines.slice(-60);
    await mkdir(join(evidenceDir, 'dreamcast'), { recursive: true });
    await writeFile(
      join(evidenceDir, 'dreamcast', 'hle-status.json'),
      JSON.stringify(status, null, 2) + '\n',
    );
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
