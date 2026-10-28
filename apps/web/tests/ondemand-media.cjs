/**
 * EMU-004 large-file proof: on-demand BlobFS random access for 512 MiB and
 * 1 GiB synthetic Files without copying the whole payload into JS or WASM
 * at mount time. Separately boots legal PSP Dot through the same BlobFS path.
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');
const { readFileSync } = require('node:fs');

const root = join(__dirname, '..', 'public');
const fixtures = join(__dirname, '..', '..', '..', '.fixtures');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-05');
const LARGE_SIZES = [512 * 1024 * 1024, 1024 * 1024 * 1024];
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

function rssKb(pid) {
  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function syntheticByte(offset) {
  return offset % 251;
}

function writeSynthetic(response, size, rangeHeader) {
  let start = 0;
  let end = size - 1;
  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const [from, to] = rangeHeader.slice(6).split('-');
    start = Number(from) || 0;
    end = to === '' || to === undefined ? size - 1 : Number(to);
    response.writeHead(206, {
      'Content-Type': 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
  } else {
    response.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Length': size,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
  }

  const chunk = Buffer.alloc(1024 * 1024);
  let offset = start;
  const writeNext = () => {
    while (offset <= end) {
      const len = Math.min(chunk.length, end - offset + 1);
      for (let i = 0; i < len; i++) chunk[i] = syntheticByte(offset + i);
      offset += len;
      if (!response.write(chunk.subarray(0, len))) {
        response.once('drain', writeNext);
        return;
      }
    }
    response.end();
  };
  writeNext();
}

const probeHtml = `<!doctype html><title>On-demand media</title>
<script src="/runtime/seekable-fs.js"></script>
<script>
window.addEventListener('load', () => {
  if (!crossOriginIsolated) throw new Error('not isolated');
  if (typeof SharedArrayBuffer === 'undefined') throw new Error('no SAB');
});
</script>`;

const pspOuter = `<!doctype html><title>PSP on-demand smoke</title>
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
    const bytes = await (await fetch('/fixture.pbp')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'ondemand-psp-1',
      file: new File([bytes], 'mit-psp-dot.pbp'),
      core: 'ppsspp',
      name: 'mit-psp-dot.pbp',
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'ondemand-psp-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'ondemand-psp-1',command,value}, location.origin);
</script>`;

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (request.url === '/probe') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(probeHtml);
  if (request.url === '/psp') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(pspOuter);
  const synthetic = request.url && request.url.match(/^\/synthetic\/(\d+)\.bin$/);
  if (synthetic) {
    writeSynthetic(response, Number(synthetic[1]), request.headers.range);
    return;
  }
  try {
    const requested =
      request.url === '/fixture.pbp'
        ? join(fixtures, 'mit-psp-dot.pbp')
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

function browserPid(browser) {
  try {
    if (typeof browser.process === 'function') return browser.process()?.pid ?? null;
  } catch {
    /* ignore */
  }
  try {
    return browser._browserProcess?.process?.pid ?? null;
  } catch {
    return null;
  }
}

async function run() {
  const server = createServer((request, response) => handler(request, response));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const chromePid = browserPid(browser);
  const results = { largeFiles: [], psp: null, processRssKb: { before: rssKb(chromePid), pid: chromePid } };

  try {
    for (const size of LARGE_SIZES) {
      const page = await browser.newPage();
      page.on('pageerror', (error) => console.error('PAGE', error.message));
      await page.goto(`http://127.0.0.1:${port}/probe`);
      // Stage 1: materialize the Blob/File (RSS may grow ≈ file size in blob store).
      await page.evaluate(async (fileSize) => {
        const response = await fetch('/synthetic/' + fileSize + '.bin');
        if (!response.ok) throw new Error('synthetic fetch failed');
        const blob = await response.blob();
        window.__largeFile = new File([blob], 'large.bin', { type: 'application/octet-stream' });
        if (window.__largeFile.size !== fileSize) throw new Error('blob size ' + window.__largeFile.size);
      }, size);
      const afterFetchRss = rssKb(chromePid);
      // Stage 2: on-demand reads only — working set must stay windowed.
      const beforeReadsRss = rssKb(chromePid);
      const stats = await page.evaluate(async () => {
        const file = window.__largeFile;
        const reader = window.RetroSeekableFS.createBlobReader();
        if (!reader) throw new Error('reader unavailable');
        await reader.ensureReady();
        const id = reader.register(file);
        const size = file.size;
        const reads = [
          [0, 4096],
          [size - 8192, 8192],
          [Math.floor(size / 2), 65536],
          [16 * 1024 * 1024 + 17, 4096],
          [size - 1, 1],
        ];
        let bytesRead = 0;
        let peakPayload = 0;
        const syntheticByte = (offset) => offset % 251;
        for (const [offset, length] of reads) {
          const want = Math.min(length, size - offset);
          const got = reader.readSync(id, offset, want);
          if (got.length !== want) throw new Error('short read at ' + offset);
          for (let i = 0; i < want; i++) {
            if (got[i] !== syntheticByte(offset + i)) throw new Error('mismatch at ' + (offset + i));
          }
          bytesRead += got.length;
          if (got.length > peakPayload) peakPayload = got.length;
        }
        let oversizedRejected = false;
        try {
          reader.readSync(id, 0, window.RetroSeekableFS.PAYLOAD_BYTES + 1);
        } catch {
          oversizedRejected = true;
        }
        if (!oversizedRejected) throw new Error('oversized read accepted');
        const jsHeap = performance.memory
          ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize }
          : null;
        const readerStats = reader.stats();
        const sabByteLength = reader.sabByteLength;
        reader.unregister(id);
        reader.dispose();
        window.__largeFile = null;
        return {
          fileSize: size,
          bytesRead,
          peakPayload,
          payloadCapacity: window.RetroSeekableFS.PAYLOAD_BYTES,
          onDemandThreshold: window.RetroSeekableFS.ON_DEMAND_THRESHOLD,
          readerStats,
          jsHeap,
          sabByteLength,
        };
      });
      const afterReadsRss = rssKb(chromePid);
      if (stats.fileSize !== size) throw new Error(`size mismatch ${stats.fileSize}`);
      if (stats.peakPayload > 8 * 1024 * 1024) throw new Error(`peak ${stats.peakPayload}`);
      if (stats.sabByteLength !== 16 + 8 * 1024 * 1024) throw new Error(`sab ${stats.sabByteLength}`);
      if (stats.jsHeap && stats.jsHeap.usedJSHeapSize > 128 * 1024 * 1024) {
        throw new Error(`JS heap too large during on-demand reads: ${stats.jsHeap.usedJSHeapSize}`);
      }
      if (beforeReadsRss != null && afterReadsRss != null) {
        const growthBytes = (afterReadsRss - beforeReadsRss) * 1024;
        // Random-access proof: reading windows must not allocate ≈ file size again.
        if (growthBytes > 64 * 1024 * 1024) {
          throw new Error(
            `RSS grew too much during on-demand reads for size ${size}: growth=${growthBytes} before=${beforeReadsRss}KiB after=${afterReadsRss}KiB`,
          );
        }
        stats.processRssKb = {
          afterFetch: afterFetchRss,
          beforeReads: beforeReadsRss,
          afterReads: afterReadsRss,
          readGrowthKiB: afterReadsRss - beforeReadsRss,
        };
      }
      results.largeFiles.push(stats);
      await page.close();
      console.log(`ONDEMAND_LARGE_PASS ${JSON.stringify(stats)}`);
    }

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
    });
    await page.goto(`http://127.0.0.1:${port}/psp`);
    const ready = await Promise.race([
      page.evaluate(() => window.result),
      page.waitForTimeout(120000).then(() => {
        throw new Error('PSP on-demand ready timed out');
      }),
    ]);
    if (!ready.capabilities?.onDemandMedia) throw new Error(`expected onDemandMedia: ${JSON.stringify(ready.capabilities)}`);
    const seekableMount = await page.evaluate(() => window.command('seekableStats'));
    if (!seekableMount?.onDemand) throw new Error(`seekable stats not on-demand: ${JSON.stringify(seekableMount)}`);
    if (seekableMount.bytesWritten !== 0) throw new Error(`on-demand mount wrote into MEMFS: ${seekableMount.bytesWritten}`);
    await page.waitForTimeout(2500);
    await page.context().setOffline(true);
    const frame = page.locator('#game');
    const before = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    const state = await page.evaluate(() => window.command('save'));
    if (!(state?.byteLength > 1024)) throw new Error('save state too small');
    await page.evaluate(() => window.input(6, 1));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.input(6, 0));
    const moved = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    if (!(moved.x < before.x - 10)) throw new Error(`input failed ${before.x} -> ${moved.x}`);
    await page.evaluate((saved) => window.command('load', saved), state);
    await page.waitForTimeout(250);
    const restored = greenDotCenter(PNG.sync.read(await frame.screenshot()));
    if (Math.abs(restored.x - before.x) > 8) throw new Error(`restore failed ${before.x} -> ${restored.x}`);
    const seekable = await page.evaluate(() => window.command('seekableStats'));
    const readerReads = seekable?.reader?.reads || seekable?.reads || 0;
    if (!(readerReads > 0 || seekable.bytesRead > 0)) {
      throw new Error(`expected on-demand reads during gameplay: ${JSON.stringify(seekable)}`);
    }
    const shot = join(evidenceDir, 'screenshots', 'psp-ondemand-gameplay.png');
    await page.screenshot({ path: shot, fullPage: true });
    results.psp = {
      capabilities: ready.capabilities,
      seekableMount,
      seekable,
      before,
      moved,
      restored,
      stateBytes: state.byteLength,
    };
    results.processRssKb.after = rssKb(chromePid);
    console.log(`ONDEMAND_PSP_PASS ${JSON.stringify(results.psp)}`);
    console.log(`ONDEMAND_MEDIA_PASS ${JSON.stringify({ largeFiles: results.largeFiles.map((item) => item.fileSize), processRssKb: results.processRssKb })}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
