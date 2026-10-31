/**
 * FDS + OpenDiskSysROM (LGPL) + FCEUmm browser smoke.
 * Catalog FDS remains disabled — this proves BIOS mount + disk load only.
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/fds-opendisksys-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');
const { createHash } = require('node:crypto');

const root = join(__dirname, '..', 'public');
const fixtureName = 'fds-dreamful-diskmag.fds';
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const biosPath = join(
  __dirname,
  '..',
  '..',
  '..',
  '.private-runtime',
  'firmware',
  'fds',
  'disksys.rom',
);
const evidenceDir = resolveEvidenceDir('PH-12');
const session = 'fds-opendisksys-1';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const EXPECT_BIOS_SHA =
  '6ce74ea4e9407c8d1175a58b7af08f073fa6b9f9b54e4f4954828ae1b6872ba6';
const EXPECT_FDS_SHA =
  '289e9e1eb5a8ad38284d66bf6429e930d3c2cab8e36513cb9fc0943b27dbb8b4';

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.fds': 'application/octet-stream',
  '.rom': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.map': 'application/json',
};

const outer = `<!doctype html><title>FDS OpenDiskSysROM smoke</title>
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
    const disk = await (await fetch('/fixture.bin')).blob();
    const bios = await (await fetch('/bios.bin')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type:'init', session:'${session}',
      file:new File([disk], '${fixtureName}'),
      bios:new File([bios], 'disksys.rom'),
      core:'fceumm', name:'${fixtureName}'
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'${session}',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'${session}',command,value}, location.origin);
window.probeFs = async () => {
  const win = document.querySelector('iframe').contentWindow;
  const gm = win.EJS_emulator?.gameManager;
  const ext = win.EJS_externalFiles || {};
  if (!gm?.FS) return { error: 'NO_FS', externalKeys: Object.keys(ext) };
  const candidates = [
    '/disksys.rom',
    '/home/web_user/retroarch/userdata/system/disksys.rom',
  ];
  const listed = [];
  const walk = [];
  for (const p of [
    '/home',
    '/home/web_user',
    '/home/web_user/retroarch',
    '/home/web_user/retroarch/userdata',
    '/home/web_user/retroarch/userdata/system',
  ]) {
    try {
      walk.push({ p, ents: gm.FS.readdir(p) });
    } catch (e) {
      walk.push({ p, err: e?.errno || e?.code || String(e?.message || e) });
    }
  }
  try {
    listed.push(...gm.FS.readdir('/home/web_user/retroarch/userdata/system'));
  } catch (e) {
    listed.push('SYSTEM_MISSING:' + (e?.errno || e?.code || String(e?.message || e)));
  }
  for (const path of candidates) {
    try {
      const raw = gm.FS.readFile(path);
      return {
        path,
        bytes: raw.byteLength || raw.length,
        externalKeys: Object.keys(ext),
        systemListing: listed,
      };
    } catch {
      /* try next */
    }
  }
  // Scan content dir for any 8192-byte file that might be the bios blob uuid.
  let content = [];
  try { content = gm.FS.readdir('/'); } catch { /* ignore */ }
  return {
    error: 'DISKSYS_NOT_FOUND',
    externalKeys: Object.keys(ext),
    systemListing: listed,
    walk,
    rootListing: content.slice(0, 40),
    uuidBytes: (() => {
      try {
        const u = content.find((n) => /^[0-9a-f-]{36}$/i.test(n));
        if (!u) return null;
        const raw = gm.FS.readFile('/' + u);
        return { name: u, bytes: raw.byteLength || raw.length };
      } catch {
        return null;
      }
    })(),
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
  for (let y = 8; y < png.height; y += 16) {
    for (let x = 8; x < png.width; x += 16) {
      const i = (y * png.width + x) * 4;
      h = (h * 33 + png.data[i] + png.data[i + 1] * 3 + png.data[i + 2] * 7) >>> 0;
    }
  }
  return h;
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
        : pathname === '/bios.bin'
          ? biosPath
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
  const shotDir = join(evidenceDir, 'fds', 'screenshots');
  await mkdir(shotDir, { recursive: true });

  const biosBytes = await readFile(biosPath);
  const fdsBytes = await readFile(fixture);
  if (biosBytes.length !== 8192) throw new Error(`BIOS size ${biosBytes.length} != 8192`);
  const biosSha = createHash('sha256').update(biosBytes).digest('hex');
  const fdsSha = createHash('sha256').update(fdsBytes).digest('hex');
  if (biosSha !== EXPECT_BIOS_SHA) throw new Error(`BIOS sha mismatch ${biosSha}`);
  if (fdsSha !== EXPECT_FDS_SHA) throw new Error(`FDS sha mismatch ${fdsSha}`);

  const server = createServer(handler);
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
      const t = message.type();
      if (t === 'error' || t === 'warning' || /RBG_/i.test(message.text())) {
        console.error(`CONSOLE[${t}] ${message.text()}`);
      }
    });
    page.on('pageerror', (err) => console.error('PAGEERROR', err.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await Promise.race([
      page.evaluate(() => window.result),
      new Promise((_, reject) => setTimeout(() => reject(new Error('FDS ready timed out')), 120000)),
    ]);

    const fsProbe = await page.evaluate(() => window.probeFs());
    if (fsProbe.error || fsProbe.bytes !== 8192) {
      throw new Error(`disksys.rom not mounted: ${JSON.stringify(fsProbe)}`);
    }

    const frame = page.locator('#game');
    let png = null;
    let lit = 0;
    let hash = 0;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(500);
      png = PNG.sync.read(await frame.screenshot());
      lit = nonBlackPixels(png);
      hash = sampleHash(png);
      if (lit > 200) break;
    }
    await frame.screenshot({ path: join(shotDir, 'fds-boot.png') });
    if (lit < 80) throw new Error(`framebuffer almost black after boot (${lit})`);

    // Reject RetroArch Ozone "Main Menu" — that is NOT FDS gameplay.
    const looksLikeRaMenu = await page.evaluate(async () => {
      const win = document.querySelector('iframe').contentWindow;
      const canvas = win.document.querySelector('canvas');
      if (!canvas) return true;
      // RA menu is a large gray UI; game content for Dreamful is colorful.
      // Also check libretro console trail if exposed.
      return false;
    });
    // Pixel heuristic: Ozone menu is mostly flat gray (~40-60 per channel).
    function raMenuLikely(img) {
      let grayish = 0;
      let samples = 0;
      for (let y = 20; y < img.height - 40; y += 12) {
        for (let x = 20; x < img.width - 20; x += 12) {
          const i = (y * img.width + x) * 4;
          const r = img.data[i];
          const g = img.data[i + 1];
          const b = img.data[i + 2];
          samples++;
          if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 35 && r < 90) grayish++;
        }
      }
      return samples > 0 && grayish / samples > 0.45;
    }
    if (raMenuLikely(png) || looksLikeRaMenu) {
      throw new Error('RETROARCH_MENU_NOT_FDS_GAMEPLAY');
    }

    // Input probe (diskmag menus — D-pad / A)
    const before = png;
    for (const cmd of [5, 4, 0, 8]) {
      await page.evaluate((c) => window.input(c, 1), cmd);
      await page.waitForTimeout(120);
      await page.evaluate((c) => window.input(c, 0), cmd);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(800);
    const after = PNG.sync.read(await frame.screenshot());
    const delta = frameDelta(before, after);
    await frame.screenshot({ path: join(shotDir, 'fds-after-input.png') });

    let saveOk = false;
    let saveBytes = 0;
    if (result.capabilities?.saveState) {
      try {
        const saved = await page.evaluate(async () => {
          const v = await window.command('save');
          return Array.from(v instanceof Uint8Array ? v : new Uint8Array(v || []));
        });
        saveBytes = saved.length;
        if (saved.length > 64) {
          await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), saved);
          saveOk = true;
        }
      } catch (e) {
        console.warn('SAVE_SOFT', String(e.message || e));
      }
    }

    if (!process.env.SKIP_OFFLINE) {
      await page.context().setOffline(true);
      await page.waitForTimeout(400);
      const offlinePng = PNG.sync.read(await frame.screenshot());
      if (nonBlackPixels(offlinePng) < 40) throw new Error('offline after restore went black');
    }

    const interactive = delta > 30;
    const summary = {
      biosSha,
      fdsSha,
      biosMountedBytes: fsProbe.bytes,
      biosPath: fsProbe.path,
      lit,
      hash,
      inputDelta: delta,
      interactive,
      saveOk,
      saveBytes,
      capabilities: result.capabilities,
      catalogFds: 'DISABLED',
      bios: 'OpenDiskSysROM LGPL-3.0',
      fixture: 'Dreamful diskmag (noncommercial shareware)',
    };
    await writeFile(join(evidenceDir, 'fds', 'smoke-summary.json'), JSON.stringify(summary, null, 2));

    if (!interactive) {
      throw new Error(`no input-driven framebuffer change (delta=${delta})`);
    }

    console.log('FDS_OPENDISKSYS_GAMEPLAY_PASS', JSON.stringify(summary));
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
