/**
 * Dreamcast Flycast — large CDI on-demand mount + gameplay (MIT Dot).
 * Marker: DREAMCAST_CDI_GAMEPLAY_PASS
 *
 * Proves BlobFS on-demand (bytesWritten=0 at mount) for ~700 MiB CDI.
 * Does not claim broad CDI compatibility beyond this mkdcdisc variant.
 *
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/dreamcast-cdi-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { mkdir, writeFile, stat } = require('node:fs/promises');
const { createReadStream, existsSync } = require('node:fs');
const { join, normalize, extname } = require('node:path');
const { createHash } = require('node:crypto');
const { PNG } = require('pngjs');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');

const root = join(__dirname, '..', 'public');
const cdiPath = join(__dirname, '..', '..', '..', '.fixtures', 'dreamcast-dot.cdi');
const cdiName = 'mit-dreamcast-dot.cdi';
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
  '.cdi': 'application/octet-stream',
};

const outer = `<!doctype html><title>Dreamcast CDI smoke</title>
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
    const bytes = await (await fetch('/fixture.cdi')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'dc-cdi-1',
      file: new File([bytes], '${cdiName}'),
      core: 'flycast',
      name: '${cdiName}',
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 90000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'dc-cdi-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'dc-cdi-1',command,value}, location.origin);
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
window.heap = () => {
  try {
    const m = document.querySelector('#game').contentWindow.EJS_emulator.Module;
    return m?.HEAPU8?.length || m?.wasmMemory?.buffer?.byteLength || 0;
  } catch { return 0; }
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
  if (!existsSync(cdiPath)) throw new Error(`missing CDI ${cdiPath}`);
  const cdiStat = await stat(cdiPath);
  await mkdir(shotDir, { recursive: true });
  const fixtureSha = await new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(cdiPath)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });

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
    if (url.pathname === '/fixture.cdi') requested = cdiPath;
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
  page.setDefaultTimeout(420000);
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`PAGEERROR ${e.message}`));

  const status = {
    format: 'cdi',
    core: 'flycast',
    cdiBytes: cdiStat.size,
    fixtureSha256: fixtureSha,
    variant: 'mkdcdisc-mil-cd-audio-data',
  };

  try {
    const bootStarted = Date.now();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    const ready = await Promise.race([
      page.evaluate(() => window.result),
      new Promise((_, reject) => setTimeout(() => reject(new Error('flycast CDI ready timed out')), 360000)),
    ]);
    status.readyMs = Date.now() - bootStarted;
    status.ready = ready;
    status.capabilities = ready?.capabilities || null;
    console.log('DREAMCAST_CDI_READY', JSON.stringify(ready?.capabilities || {}));

    const seekable = await page.evaluate(() => window.command('seekableStats'));
    status.seekableMount = seekable;
    status.wasmHeap = await page.evaluate(() => window.heap());
    if (!seekable?.onDemand) {
      throw new Error(`expected on-demand BlobFS for CDI: ${JSON.stringify(seekable)}`);
    }
    if (seekable.bytesWritten !== 0) {
      throw new Error(`CDI mount wrote full media into MEMFS: ${seekable.bytesWritten}`);
    }
    // Heap must not grow by ~CDI size at mount.
    if (status.wasmHeap > 0 && status.wasmHeap + 32 * 1024 * 1024 < cdiStat.size) {
      status.heapBoundOk = true;
    } else if (status.wasmHeap === 0) {
      status.heapBoundOk = null;
      status.heapNote = 'WASM heap length unavailable';
    } else {
      status.heapBoundOk = status.wasmHeap < cdiStat.size;
    }
    if (status.heapBoundOk === false) {
      throw new Error(`WASM heap ${status.wasmHeap} suggests full CDI copy`);
    }

    await page.waitForTimeout(15000);
    await page.locator('#game').click({ position: { x: 480, y: 360 } }).catch(() => {});
    await page.waitForTimeout(1000);

    const f0 = await page.evaluate(() => window.frame());
    const idlePng = fromDataUrl(await page.evaluate(() => window.snap()));
    const idle = dotStats(idlePng);
    status.idle = { ...idle, hash: sampleHash(idlePng) };
    await writeFile(join(shotDir, 'cdi-idle.png'), PNG.sync.write(idlePng));

    if (idle.n < 100) {
      status.boot = 'DREAMCAST_CDI_BOOT_BLACK';
      console.log('DREAMCAST_CDI_BOOT_BLACK', JSON.stringify({ idle, seekable }));
      process.exitCode = 1;
    } else {
      status.boot = 'DREAMCAST_CDI_BOOT_VISIBLE';
      console.log('DREAMCAST_CDI_BOOT_VISIBLE', JSON.stringify(idle));

      await page.evaluate(() => window.input(6, 1));
      await page.waitForTimeout(2500);
      const left = dotStats(fromDataUrl(await page.evaluate(() => window.snap())));
      await page.evaluate(() => window.input(6, 0));
      await page.evaluate(() => window.input(7, 1));
      await page.waitForTimeout(2500);
      const right = dotStats(fromDataUrl(await page.evaluate(() => window.snap())));
      await page.evaluate(() => window.input(7, 0));
      status.left = left;
      status.right = right;
      status.movedLeft = left.n > 100 && left.x < idle.x - 8;
      status.movedRight = right.n > 100 && right.x > left.x + 8;

      const f1 = await page.evaluate(() => window.frame());
      status.frames = [f0, f1];
      status.frameDelta = f1 - f0;

      const seekableAfter = await page.evaluate(() => window.command('seekableStats'));
      status.seekableAfter = seekableAfter;
      const reads = (seekableAfter?.reader?.reads || 0) + (seekableAfter?.reads || 0);
      status.randomReadsObserved = reads > 0 || (seekableAfter?.bytesRead || 0) > 0;
      status.peakStaging =
        seekableAfter?.reader?.peakPayload || seekableAfter?.peakPayload || seekable?.peakPayload || 0;

      const gameplay =
        status.movedLeft &&
        status.movedRight &&
        status.frameDelta > 200 &&
        idle.n > 100 &&
        status.randomReadsObserved;
      if (gameplay) {
        status.gameplay = 'DREAMCAST_CDI_GAMEPLAY_PASS';
        console.log('DREAMCAST_CDI_GAMEPLAY_PASS');
      } else {
        status.gameplay = 'DREAMCAST_CDI_GAMEPLAY_INCONCLUSIVE';
        console.log('DREAMCAST_CDI_GAMEPLAY_INCONCLUSIVE', JSON.stringify(status));
        process.exitCode = 1;
      }
    }
  } catch (err) {
    status.boot = 'DREAMCAST_CDI_BOOT_FAIL';
    status.error = String(err && err.stack ? err.stack : err);
    console.error('DREAMCAST_CDI_BOOT_FAIL', err);
    process.exitCode = 1;
  } finally {
    status.consoleTail = consoleLines.slice(-100);
    await writeFile(join(outDir, 'cdi-status.json'), JSON.stringify(status, null, 2) + '\n');
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
