/**
 * Dreamcast Flycast — interactive M3U multi-disc swap (MIT Dot disc1/disc2 CHD).
 * Marker: DREAMCAST_DISC_SWAP_INTERACTIVE_PASS
 *
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/dreamcast-disc-swap-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { mkdir, writeFile, readFile, stat } = require('node:fs/promises');
const { createReadStream, existsSync } = require('node:fs');
const { join, normalize, extname } = require('node:path');
const { createHash } = require('node:crypto');
const { PNG } = require('pngjs');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');

const root = join(__dirname, '..', 'public');
const fixtures = join(__dirname, '..', '..', '..', '.fixtures');
const m3uName = 'mit-dreamcast-dot-multidisc.m3u';
const disc1Name = 'mit-dreamcast-dot.chd';
const disc2Name = 'mit-dreamcast-dot-disc2.chd';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-12');
const outDir = join(evidenceDir, 'dreamcast-disc-swap');
const shotDir = join(outDir, 'screenshots');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.chd': 'application/octet-stream',
  '.m3u': 'audio/x-mpegurl',
};

const outer = `<!doctype html><title>Dreamcast disc-swap smoke</title>
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
    const m3u = await (await fetch('/fixture.m3u')).blob();
    const d1 = await (await fetch('/fixture-disc1.chd')).blob();
    const d2 = await (await fetch('/fixture-disc2.chd')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'dc-swap-1',
      file: new File([m3u], '${m3uName}', { type: 'audio/x-mpegurl' }),
      companions: [
        new File([d1], '${disc1Name}'),
        new File([d2], '${disc2Name}'),
      ],
      core: 'flycast',
      name: '${m3uName}',
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), method === 'setDiskIndex' ? 240000 : 90000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'dc-swap-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'dc-swap-1',command,value}, location.origin);
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

/** Classify idle pixels: cool-grey (disc1) vs green (disc2). */
function idleClassStats(png) {
  let grey = 0;
  let green = 0;
  let fire = 0;
  let sx = 0;
  let sy = 0;
  let n = 0;
  const w = png.width;
  for (let i = 0, p = 0; i < png.data.length; i += 4, p++) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const isGrey = r > 160 && g > 160 && b > 180 && Math.abs(r - g) < 40;
    const isGreen = g > 150 && r < 130 && b < 140 && g > r + 40;
    const isFire = r > 180 && g < 120 && b < 120;
    if (isGrey || isGreen || isFire) {
      sx += p % w;
      sy += (p / w) | 0;
      n++;
      if (isGrey) grey++;
      if (isGreen) green++;
      if (isFire) fire++;
    }
  }
  return {
    x: n ? sx / n : 0,
    y: n ? sy / n : 0,
    n,
    grey,
    green,
    fire,
    identity: green > grey * 2 && green > 80 ? 'disc2-green' : grey > green * 2 && grey > 80 ? 'disc1-grey' : 'unknown',
  };
}

async function run() {
  for (const name of [m3uName, disc1Name, disc2Name]) {
    if (!existsSync(join(fixtures, name))) throw new Error(`missing fixture ${name}`);
  }
  await mkdir(shotDir, { recursive: true });

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'no-store',
    };
    if (url.pathname === '/') {
      res.writeHead(200, { ...headers, 'content-type': 'text/html' });
      res.end(outer);
      return;
    }
    const map = {
      '/fixture.m3u': join(fixtures, m3uName),
      '/fixture-disc1.chd': join(fixtures, disc1Name),
      '/fixture-disc2.chd': join(fixtures, disc2Name),
    };
    let requested = map[url.pathname];
    if (!requested) {
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
    format: 'm3u+chd',
    core: 'flycast',
    discs: [disc1Name, disc2Name],
  };

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    const ready = await Promise.race([
      page.evaluate(() => window.result),
      new Promise((_, reject) => setTimeout(() => reject(new Error('ready timed out')), 240000)),
    ]);
    status.ready = ready?.capabilities || null;
    console.log('DREAMCAST_DISC_SWAP_READY', JSON.stringify(status.ready));

    await page.waitForTimeout(15000);
    await page.locator('#game').click({ position: { x: 480, y: 360 } }).catch(() => {});
    await page.waitForTimeout(1000);

    const count0 = await page.evaluate(() => window.command('diskCount'));
    const index0 = await page.evaluate(() => window.command('diskIndex'));
    status.diskCount = count0;
    status.diskIndex0 = index0;
    if (count0 < 2) throw new Error(`expected >=2 discs, got ${count0}`);

    const idle1Png = fromDataUrl(await page.evaluate(() => window.snap()));
    const idle1 = idleClassStats(idle1Png);
    status.disc1 = { ...idle1, hash: sampleHash(idle1Png) };
    await writeFile(join(shotDir, 'disc1-idle.png'), PNG.sync.write(idle1Png));
    if (idle1.identity !== 'disc1-grey') {
      throw new Error(`disc1 identity expected disc1-grey, got ${JSON.stringify(idle1)}`);
    }

    // Adapter swaps boot-path bytes + soft-reset (Flycast WASM aborts on .m3u content).
    const swap1 = await page.evaluate(() => window.command('setDiskIndex', 1));
    status.swapToDisc2 = swap1;
    await page.waitForTimeout(8000);
    await page.locator('#game').click({ position: { x: 480, y: 360 } }).catch(() => {});
    await page.waitForTimeout(1000);
    const index1 = await page.evaluate(() => window.command('diskIndex'));
    status.diskIndex1 = index1;
    if (index1 !== 1) throw new Error(`after swap expected index 1, got ${index1}`);

    const idle2Png = fromDataUrl(await page.evaluate(() => window.snap()));
    const idle2 = idleClassStats(idle2Png);
    status.disc2 = { ...idle2, hash: sampleHash(idle2Png) };
    await writeFile(join(shotDir, 'disc2-idle.png'), PNG.sync.write(idle2Png));
    if (idle2.identity !== 'disc2-green') {
      throw new Error(`disc2 identity expected disc2-green, got ${JSON.stringify(idle2)}`);
    }

    // Prove disc2 is interactive (move left).
    await page.evaluate(() => window.input(6, 1));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.input(6, 0));
    const moved2 = idleClassStats(fromDataUrl(await page.evaluate(() => window.snap())));
    status.disc2Moved = moved2;
    status.disc2Interactive = moved2.n > 50 && moved2.identity === 'disc2-green' && moved2.x < idle2.x - 6;

    // Swap back to disc 1 (adapter rewrites boot path + restart).
    const swap0 = await page.evaluate(() => window.command('setDiskIndex', 0));
    status.swapToDisc1 = swap0;
    await page.waitForTimeout(8000);
    await page.locator('#game').click({ position: { x: 480, y: 360 } }).catch(() => {});
    await page.waitForTimeout(1000);
    const index2 = await page.evaluate(() => window.command('diskIndex'));
    status.diskIndex2 = index2;
    const idleBackPng = fromDataUrl(await page.evaluate(() => window.snap()));
    const idleBack = idleClassStats(idleBackPng);
    status.disc1Back = { ...idleBack, hash: sampleHash(idleBackPng) };
    await writeFile(join(shotDir, 'disc1-after-swap-back.png'), PNG.sync.write(idleBackPng));

    // Reject invalid index.
    let rejected = false;
    try {
      await page.evaluate(() => window.command('setDiskIndex', 99));
    } catch (e) {
      rejected = String(e).includes('DISK_INDEX') || String(e).includes('OUT_OF_RANGE');
      status.invalidIndexError = String(e);
    }
    status.invalidIndexRejected = rejected;

    const pass =
      count0 >= 2 &&
      idle1.identity === 'disc1-grey' &&
      idle2.identity === 'disc2-green' &&
      index1 === 1 &&
      index2 === 0 &&
      idleBack.identity === 'disc1-grey' &&
      status.disc2Interactive &&
      rejected;

    if (pass) {
      status.marker = 'DREAMCAST_DISC_SWAP_INTERACTIVE_PASS';
      console.log('DREAMCAST_DISC_SWAP_INTERACTIVE_PASS', JSON.stringify({
        diskCount: count0,
        disc1: idle1.identity,
        disc2: idle2.identity,
        disc1Back: idleBack.identity,
        disc2Interactive: status.disc2Interactive,
      }));
    } else {
      status.marker = 'DREAMCAST_DISC_SWAP_INCONCLUSIVE';
      console.log('DREAMCAST_DISC_SWAP_INCONCLUSIVE', JSON.stringify(status));
      process.exitCode = 1;
    }
  } catch (err) {
    status.marker = 'DREAMCAST_DISC_SWAP_FAIL';
    status.error = String(err && err.stack ? err.stack : err);
    console.error('DREAMCAST_DISC_SWAP_FAIL', err);
    process.exitCode = 1;
  } finally {
    status.consoleTail = consoleLines.slice(-120);
    await writeFile(join(outDir, 'disc-swap-status.json'), JSON.stringify(status, null, 2) + '\n');
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
