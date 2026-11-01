/**
 * Dreamcast Flycast WASM — HLE boot probe (no proprietary BIOS files).
 *
 * Forces reicast_hle_bios=enabled via frame defaults; loads MIT Dot ELF.
 * Marker on interactive proof: DREAMCAST_GAMEPLAY_PASS
 * Until then: logs DREAMCAST_HLE_BOOT_* diagnostics only.
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
<style>body{margin:0;background:#111;color:#eee;font:14px sans-serif}iframe{width:960px;height:720px;border:0;background:#000}</style>
<iframe id="game" src="/runtime/frame.html" allow="cross-origin-isolated"></iframe>
<pre id="log"></pre>
<script>
const log = (m) => { document.getElementById('log').textContent += m + '\\n'; console.log(m); };
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
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
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 20000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'dc-hle-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'dc-hle-1',command,value}, location.origin);
</script>`;

function nonBlackPixels(png) {
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 24) n++;
  }
  return n;
}

function sampleHash(png) {
  const h = createHash('sha256');
  h.update(Buffer.from(png.data));
  return h.digest('hex').slice(0, 16);
}

async function run() {
  if (!existsSync(fixture)) throw new Error(`missing fixture ${fixture}`);
  await mkdir(shotDir, { recursive: true });
  const fixtureSha = createHash('sha256').update(await readFile(fixture)).digest('hex');

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
      res.end(outer);
      return;
    }
    if (url.pathname === '/fixture.elf') {
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'Cross-Origin-Resource-Policy': 'same-origin' });
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
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-features=SharedArrayBuffer'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(300000);
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`PAGEERROR ${e.message}`));

  const status = {
    fixtureSha256: fixtureSha,
    core: 'flycast',
    hle: 'reicast_hle_bios=enabled',
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

    await page.waitForTimeout(8000);
    const frame = page.frameLocator('#game');
    // Capture outer iframe canvas via page screenshot of iframe element
    const png = PNG.sync.read(await page.locator('#game').screenshot());
    const lit = nonBlackPixels(png);
    const hash = sampleHash(png);
    status.lit = lit;
    status.hash = hash;
    await writeFile(join(shotDir, 'hle-idle.png'), PNG.sync.write(png));

    if (lit < 100) {
      status.boot = 'DREAMCAST_HLE_BOOT_BLACK';
      console.log('DREAMCAST_HLE_BOOT_BLACK', JSON.stringify({ lit, hash }));
    } else {
      status.boot = 'DREAMCAST_HLE_BOOT_VISIBLE';
      console.log('DREAMCAST_HLE_BOOT_VISIBLE', JSON.stringify({ lit, hash }));
      // Light A/B/A — Left vs Right
      await page.evaluate(() => window.input(6, 1));
      await page.waitForTimeout(1500);
      const left = PNG.sync.read(await page.locator('#game').screenshot());
      await page.evaluate(() => window.input(6, 0));
      await page.evaluate(() => window.input(7, 1));
      await page.waitForTimeout(1500);
      const right = PNG.sync.read(await page.locator('#game').screenshot());
      await page.evaluate(() => window.input(7, 0));
      const leftLit = nonBlackPixels(left);
      const rightHash = sampleHash(right);
      const leftHash = sampleHash(left);
      status.leftHash = leftHash;
      status.rightHash = rightHash;
      status.inputChanged = leftHash !== hash || rightHash !== hash || leftHash !== rightHash;
      await writeFile(join(shotDir, 'hle-left.png'), PNG.sync.write(left));
      await writeFile(join(shotDir, 'hle-right.png'), PNG.sync.write(right));
      if (status.inputChanged && leftLit > 100) {
        status.gameplay = 'DREAMCAST_GAMEPLAY_PASS';
        console.log('DREAMCAST_GAMEPLAY_PASS');
      } else {
        status.gameplay = 'DREAMCAST_GAMEPLAY_INCONCLUSIVE';
        console.log('DREAMCAST_GAMEPLAY_INCONCLUSIVE', JSON.stringify({ leftHash, rightHash, idle: hash }));
      }
    }
  } catch (err) {
    status.boot = 'DREAMCAST_HLE_BOOT_FAIL';
    status.error = String(err && err.stack ? err.stack : err);
    console.error('DREAMCAST_HLE_BOOT_FAIL', err);
    process.exitCode = 1;
  } finally {
    status.consoleTail = consoleLines.slice(-40);
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
