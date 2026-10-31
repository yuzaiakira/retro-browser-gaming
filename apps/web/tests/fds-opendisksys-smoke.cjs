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
// Prefer first-party MIT move-demo (deterministic sprite). Dreamful diskmag is
// retained for BIOS-load regression only when MOVE_DEMO is absent.
const moveDemoName = 'fds-rbg-move-demo.fds';
const dreamfulName = 'fds-dreamful-diskmag.fds';
const fixturesDir = join(__dirname, '..', '..', '..', '.fixtures');
const useMoveDemo = require('node:fs').existsSync(join(fixturesDir, moveDemoName));
const fixtureName = useMoveDemo ? moveDemoName : dreamfulName;
const fixture = join(fixturesDir, fixtureName);
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
const EXPECT_FDS_SHA = useMoveDemo
  ? 'c8b5b2b3f0f8f75112b1fc78269fc991952c0165bf72f6a1514e8562583541a5'
  : '289e9e1eb5a8ad38284d66bf6429e930d3c2cab8e36513cb9fc0943b27dbb8b4';

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

    // Deterministic A/B/A: idle control vs held directional input from the same save.
    // Dreamful is a diskmag — prove player-controlled delta exceeds idle animation.
    let saveOk = false;
    let saveBytes = 0;
    let baselineSave = null;
    if (result.capabilities?.saveState) {
      try {
        const saved = await page.evaluate(async () => {
          const v = await window.command('save');
          return Array.from(v instanceof Uint8Array ? v : new Uint8Array(v || []));
        });
        saveBytes = saved.length;
        if (saved.length > 64) {
          baselineSave = saved;
          saveOk = true;
        }
      } catch (e) {
        console.warn('SAVE_SOFT', String(e.message || e));
      }
    }
    if (!baselineSave) {
      throw new Error('FDS A/B/A requires a baseline save state');
    }

    async function restoreBaseline() {
      await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), baselineSave);
      await page.waitForTimeout(400);
    }

    async function captureSeq(label, holdCmd, frames = 6) {
      const shots = [];
      for (let i = 0; i < frames; i++) {
        if (holdCmd != null) {
          await page.evaluate((c) => window.input(c, 1), holdCmd);
        }
        await page.waitForTimeout(200);
        shots.push(PNG.sync.read(await frame.screenshot()));
      }
      if (holdCmd != null) {
        await page.evaluate((c) => window.input(c, 0), holdCmd);
      }
      await frame.screenshot({ path: join(shotDir, `fds-aba-${label}.png`) });
      return shots;
    }

    function seqMotion(shots) {
      let total = 0;
      for (let i = 1; i < shots.length; i++) total += frameDelta(shots[i - 1], shots[i]);
      return total;
    }

    function seqVsFirst(shots) {
      let total = 0;
      for (let i = 1; i < shots.length; i++) total += frameDelta(shots[0], shots[i]);
      return total;
    }

    // A: restore + no input
    await restoreBaseline();
    const idleShots = await captureSeq('idle-control', null);
    const idleMotion = seqMotion(idleShots);
    const idleVsFirst = seqVsFirst(idleShots);

    // B: restore + hold Left (libretro 6)
    await restoreBaseline();
    const leftShots = await captureSeq('hold-left', 6);
    const leftMotion = seqMotion(leftShots);
    const leftVsFirst = seqVsFirst(leftShots);
    const leftVsIdle = frameDelta(idleShots[idleShots.length - 1], leftShots[leftShots.length - 1]);

    // A again: restore + hold Right (libretro 7) — opposite direction
    await restoreBaseline();
    const rightShots = await captureSeq('hold-right', 7);
    const rightMotion = seqMotion(rightShots);
    const rightVsFirst = seqVsFirst(rightShots);
    const rightVsLeft = frameDelta(leftShots[leftShots.length - 1], rightShots[rightShots.length - 1]);

    // Button A (8) reaction from baseline
    await restoreBaseline();
    const btnShots = await captureSeq('hold-a', 8);
    const btnVsIdle = frameDelta(idleShots[idleShots.length - 1], btnShots[btnShots.length - 1]);

    // Continue interacting after save/load
    await restoreBaseline();
    await page.evaluate(() => window.input(6, 1));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.input(6, 0));
    await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), baselineSave);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.input(7, 1));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.input(7, 0));
    const afterReloadInteract = PNG.sync.read(await frame.screenshot());
    const postLoadDelta = frameDelta(idleShots[0], afterReloadInteract);

    const inputExceedsIdle =
      leftVsIdle > idleVsFirst + 80 ||
      rightVsLeft > 80 ||
      (leftMotion > idleMotion * 1.35 && leftVsIdle > 120);
    const delta = Math.max(leftVsIdle, rightVsLeft, btnVsIdle);
    await frame.screenshot({ path: join(shotDir, 'fds-after-input.png') });

    const aba = {
      idleMotion,
      idleVsFirst,
      leftMotion,
      leftVsFirst,
      leftVsIdle,
      rightMotion,
      rightVsFirst,
      rightVsLeft,
      btnVsIdle,
      postLoadDelta,
      inputExceedsIdle,
      fixtureNote: useMoveDemo
        ? 'MIT first-party move-demo: sprite X follows Left/Right; A toggles Y.'
        : 'Dreamful is a diskmag (menu/text). A/B/A compares idle vs held D-pad.',
    };
    await writeFile(join(evidenceDir, 'fds', 'aba-metrics.json'), JSON.stringify(aba, null, 2));
    console.log('FDS_ABA_METRICS', JSON.stringify(aba));

    // Offline after boot (still in-session) — restore baseline first so we are not mid-fade.
    await restoreBaseline();
    await page.waitForTimeout(300);
    if (!process.env.SKIP_OFFLINE) {
      await page.context().setOffline(true);
      await page.waitForTimeout(400);
      const offlinePng = PNG.sync.read(await frame.screenshot());
      if (nonBlackPixels(offlinePng) < 40) throw new Error('offline after restore went black');
    }

    const interactive = Boolean(inputExceedsIdle && delta > 30);
    const summary = {
      biosSha,
      fdsSha,
      biosMountedBytes: fsProbe.bytes,
      biosPath: fsProbe.path,
      lit,
      hash,
      inputDelta: delta,
      interactive,
      inputExceedsIdle,
      aba,
      saveOk,
      saveBytes,
      capabilities: result.capabilities,
      catalogFds: 'DISABLED',
      bios: 'OpenDiskSysROM LGPL-3.0',
      fixture: fixtureName,
      fixtureKind: useMoveDemo ? 'first-party-mit-sprite' : 'dreamful-diskmag',
      verifiedPlayable: false,
      reason: interactive
        ? useMoveDemo
          ? 'A/B/A input exceeds idle on MIT move-demo — catalog remains disabled until full offline cold-start + NES regression gates'
          : 'A/B/A input exceeds idle on diskmag UI — Dreamful still not a deterministic sprite fixture; catalog disabled'
        : useMoveDemo
          ? 'A/B/A inconclusive on move-demo — debug joypad/BIOS load'
          : 'A/B/A could not separate input from idle animation; Dreamful unsuitable',
    };
    await writeFile(join(evidenceDir, 'fds', 'smoke-summary.json'), JSON.stringify(summary, null, 2));

    if (!interactive) {
      console.error('FDS_ABA_INCONCLUSIVE', JSON.stringify(aba));
      throw new Error(
        `FDS A/B/A inconclusive (idleVsFirst=${idleVsFirst} leftVsIdle=${leftVsIdle} rightVsLeft=${rightVsLeft})`,
      );
    }

    console.log('FDS_OPENDISKSYS_INPUT_ABA_PASS', JSON.stringify(summary));
    if (useMoveDemo) {
      console.log('FDS_MOVE_DEMO_INTERACTIVE_PASS');
    } else {
      console.log('FDS_DREAMFUL_NOT_VERIFIED_PLAYABLE');
    }
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
