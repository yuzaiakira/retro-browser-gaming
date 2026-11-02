/**
 * Dreamcast Flycast — truncated GDI multi-track gameplay (MIT Dot).
 * Marker: DREAMCAST_GDI_GAMEPLAY_PASS
 *
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/dreamcast-gdi-smoke.cjs
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
const gdiDir = join(__dirname, '..', '..', '..', '.fixtures');
const gdiName = 'mit-dreamcast-dot.gdi';
const tracks = [
  'mit-dreamcast-dot-track01.bin',
  'mit-dreamcast-dot-track02.raw',
  'mit-dreamcast-dot-track03.bin',
];
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-12');
const outDir = join(evidenceDir, 'dreamcast-large-media');
const shotDir = join(outDir, 'screenshots');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.gdi': 'text/plain',
  '.bin': 'application/octet-stream',
  '.raw': 'application/octet-stream',
};

const outer = `<!doctype html><title>Dreamcast GDI smoke</title>
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
    const gdi = await (await fetch('/fixture.gdi')).blob();
    const companions = await Promise.all([
      fetch('/mit-dreamcast-dot-track01.bin').then(r => r.blob()).then(b => new File([b], 'mit-dreamcast-dot-track01.bin')),
      fetch('/mit-dreamcast-dot-track02.raw').then(r => r.blob()).then(b => new File([b], 'mit-dreamcast-dot-track02.raw')),
      fetch('/mit-dreamcast-dot-track03.bin').then(r => r.blob()).then(b => new File([b], 'mit-dreamcast-dot-track03.bin')),
    ]);
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'dc-gdi-1',
      file: new File([gdi], '${gdiName}'),
      companions,
      core: 'flycast',
      name: '${gdiName}',
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'dc-gdi-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'dc-gdi-1',command,value}, location.origin);
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
  for (const name of [gdiName, ...tracks]) {
    if (!existsSync(join(gdiDir, name))) throw new Error(`missing ${join(gdiDir, name)}`);
  }
  await mkdir(shotDir, { recursive: true });

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
    if (url.pathname === '/') {
      res.writeHead(200, { ...headers, 'content-type': 'text/html' });
      res.end(outer);
      return;
    }
    let requested = null;
    if (url.pathname === '/fixture.gdi') requested = join(gdiDir, gdiName);
    else if (tracks.includes(url.pathname.slice(1))) requested = join(gdiDir, url.pathname.slice(1));
    else {
      const path = normalize(join(root, decodeURIComponent(url.pathname)));
      if (!path.startsWith(root)) {
        res.writeHead(403, headers);
        res.end('forbidden');
        return;
      }
      requested = path;
    }
    createReadStream(requested)
      .on('open', () => {
        res.writeHead(200, {
          ...headers,
          'content-type': types[extname(requested)] || 'application/octet-stream',
        });
      })
      .on('error', () => {
        res.writeHead(404, headers);
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
    format: 'gdi',
    core: 'flycast',
    fixtureDir: gdiDir,
  };

  try {
    const bootStarted = Date.now();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    const ready = await Promise.race([
      page.evaluate(() => window.result),
      new Promise((_, reject) => setTimeout(() => reject(new Error('flycast GDI ready timed out')), 240000)),
    ]);
    status.readyMs = Date.now() - bootStarted;
    status.ready = ready;
    status.capabilities = ready?.capabilities || null;
    console.log('DREAMCAST_GDI_READY', JSON.stringify(ready?.capabilities || {}));

    await page.waitForTimeout(12000);
    await page.locator('#game').click({ position: { x: 480, y: 360 } }).catch(() => {});
    await page.waitForTimeout(1000);

    const seekable = await page.evaluate(() => window.command('seekableStats'));
    status.seekable = seekable;
    if (!seekable?.onDemand) {
      throw new Error(`expected on-demand BlobFS for flycast GDI: ${JSON.stringify(seekable)}`);
    }
    if (seekable.bytesWritten !== 0) {
      throw new Error(`on-demand mount wrote into MEMFS: ${seekable.bytesWritten}`);
    }

    const f0 = await page.evaluate(() => window.frame());
    const idlePng = fromDataUrl(await page.evaluate(() => window.snap()));
    const idle = dotStats(idlePng);
    status.idle = { ...idle, hash: sampleHash(idlePng) };
    await writeFile(join(shotDir, 'gdi-idle.png'), PNG.sync.write(idlePng));

    if (idle.n < 100) {
      status.boot = 'DREAMCAST_GDI_BOOT_BLACK';
      console.log('DREAMCAST_GDI_BOOT_BLACK', JSON.stringify(idle));
      process.exitCode = 1;
    } else {
      status.boot = 'DREAMCAST_GDI_BOOT_VISIBLE';
      console.log('DREAMCAST_GDI_BOOT_VISIBLE', JSON.stringify(idle));

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
      await writeFile(join(shotDir, 'gdi-left.png'), PNG.sync.write(leftPng));
      await writeFile(join(shotDir, 'gdi-right.png'), PNG.sync.write(rightPng));

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
      status.approxFps = status.readyMs > 0 ? status.frameDelta / ((Date.now() - bootStarted) / 1000) : null;

      const seekableAfter = await page.evaluate(() => window.command('seekableStats'));
      status.seekableAfter = seekableAfter;
      const reads = (seekableAfter?.reader?.reads || 0) + (seekableAfter?.reads || 0);
      status.randomReadsObserved = reads > 0 || (seekableAfter?.bytesRead || 0) > 0;

      // Save/restore A/B
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

      const gameplay =
        status.movedLeft &&
        status.movedRight &&
        status.frameDelta > 200 &&
        idle.n > 100 &&
        status.randomReadsObserved;
      if (gameplay) {
        status.gameplay = 'DREAMCAST_GDI_GAMEPLAY_PASS';
        console.log('DREAMCAST_GDI_GAMEPLAY_PASS');
        if (status.saveRestore) {
          status.saveMarker = 'DREAMCAST_GDI_SAVE_RESTORE_PASS';
          console.log('DREAMCAST_GDI_SAVE_RESTORE_PASS', JSON.stringify(status.saveProbe));
        }
      } else {
        status.gameplay = 'DREAMCAST_GDI_GAMEPLAY_INCONCLUSIVE';
        console.log('DREAMCAST_GDI_GAMEPLAY_INCONCLUSIVE', JSON.stringify(status));
        process.exitCode = 1;
      }
    }
  } catch (err) {
    status.boot = 'DREAMCAST_GDI_BOOT_FAIL';
    status.error = String(err && err.stack ? err.stack : err);
    console.error('DREAMCAST_GDI_BOOT_FAIL', err);
    process.exitCode = 1;
  } finally {
    status.consoleTail = consoleLines.slice(-80);
    await writeFile(join(outDir, 'gdi-status.json'), JSON.stringify(status, null, 2) + '\n');
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
