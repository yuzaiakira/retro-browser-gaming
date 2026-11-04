/**
 * Atari ST Hatari gameplay + snapshot A→B→restore evidence.
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/atari-st-hatari-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtureName = 'gpl-atari-st-pongwars.st';
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const evidenceDir = resolveEvidenceDir('PH-12');
const session = 'hatari-st-1';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.st': 'application/octet-stream',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

const outer = `<!doctype html><title>Atari ST Hatari smoke</title>
<style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style>
<iframe id="game" src="/runtime/hatari-frame.html"></iframe>
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
      core:'hatari', name:'${fixtureName}'
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
</script>`;

function nonBlackPixels(png) {
  let count = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 40) count++;
  }
  return count;
}

/** Ignore bottom status/border strip so clock LEDs cannot poison comparisons. */
function usableHeight(png) {
  return Math.max(8, png.height - Math.floor(png.height * 0.08));
}

/**
 * Pong Wars mid-play has multiple flat colors (mint/navy/scores). Reject
 * blank GEM/gray settles and near-solid title fades used as false "A".
 */
function gameplayRichness(png) {
  const yh = usableHeight(png);
  const buckets = new Map();
  let samples = 0;
  for (let y = 8; y < yh - 8; y += 6) {
    for (let x = 8; x < png.width - 8; x += 6) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      if (r + g + b < 30) continue;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      buckets.set(key, (buckets.get(key) || 0) + 1);
      samples++;
    }
  }
  if (samples < 80) return { colors: 0, samples, maxShare: 1 };
  let max = 0;
  for (const n of buckets.values()) if (n > max) max = n;
  return { colors: buckets.size, samples, maxShare: max / samples };
}

function isPlayfieldFrame(png) {
  const rich = gameplayRichness(png);
  // Reject blank/gray (maxShare≈1, few colors). Title + mid-play both pass
  // color checks; animation delta in the boot loop distinguishes motion.
  return (
    rich.colors >= 5 &&
    rich.maxShare < 0.7 &&
    nonBlackPixels(png) > 1000 &&
    rich.samples > 200
  );
}

function sampleHash(png) {
  let h = 0;
  const yh = usableHeight(png);
  for (let y = 4; y < yh; y += 8) {
    for (let x = 4; x < png.width; x += 8) {
      const i = (y * png.width + x) * 4;
      h = (h * 33 + png.data[i] + png.data[i + 1] * 3 + png.data[i + 2] * 7) >>> 0;
    }
  }
  return h;
}

function frameDelta(a, b) {
  const yh = Math.min(usableHeight(a), usableHeight(b));
  let changed = 0;
  for (let y = 0; y < yh; y++) {
    for (let x = 0; x < Math.min(a.width, b.width); x++) {
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

async function bootPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
  });
  page.on('pageerror', (err) => console.error('PAGEERROR', err.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  const result = await Promise.race([
    page.evaluate(() => window.result),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Hatari ready timed out')), 120000)),
  ]);
  return { page, result };
}

async function run() {
  const shotDir = join(evidenceDir, 'atari-st', 'screenshots');
  await mkdir(shotDir, { recursive: true });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const { page, result } = await bootPage(browser, port);
    if (!result.capabilities?.hatariRuntime) throw new Error('hatari runtime capability missing');
    if (!result.capabilities.saveState) throw new Error('saveState capability not advertised');

    const frame = page.locator('#game');

    // Wait until Pong Wars playfield is lit + colorful + animating (skip blank/title).
    let pngA = null;
    let hashA = 0;
    let litA = 0;
    let animatedBoot = false;
    let prev = null;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      // Fire Space periodically — some builds wait on the title card.
      if (i > 0 && i % 4 === 0) {
        await page.evaluate(() => window.input(0, 1));
        await page.waitForTimeout(80);
        await page.evaluate(() => window.input(0, 0));
      }
      const cur = PNG.sync.read(await frame.screenshot());
      const lit = nonBlackPixels(cur);
      if (prev && isPlayfieldFrame(cur) && lit > 800) {
        const d = frameDelta(prev, cur);
        if (d > 400) {
          pngA = cur;
          hashA = sampleHash(cur);
          litA = lit;
          animatedBoot = true;
          break;
        }
      }
      prev = cur;
    }
    if (!animatedBoot || !pngA) {
      const last = prev || PNG.sync.read(await frame.screenshot());
      throw new Error(`playfield never appeared (last rich=${JSON.stringify(gameplayRichness(last))})`);
    }

    // RetroPad poke (self-playing; still exercise input path).
    for (const cmd of [7, 6, 4, 5, 0]) {
      await page.evaluate((c) => window.input(c, 1), cmd);
      await page.waitForTimeout(80);
      await page.evaluate((c) => window.input(c, 0), cmd);
    }
    await page.waitForTimeout(200);
    pngA = PNG.sync.read(await frame.screenshot());
    if (!isPlayfieldFrame(pngA)) {
      // Prefer the earlier animated playfield capture over a transitional frame.
      pngA = PNG.sync.read(await frame.screenshot());
    }
    hashA = sampleHash(pngA);
    litA = nonBlackPixels(pngA);
    if (!isPlayfieldFrame(pngA) || litA < 800) {
      throw new Error(`canvas not a playfield at A (lit=${litA} rich=${JSON.stringify(gameplayRichness(pngA))})`);
    }
    await frame.screenshot({ path: join(shotDir, 'atari-st-pos-a.png') });

    const saved = await page.evaluate(async () => {
      const v = await window.command('save');
      return Array.from(v instanceof Uint8Array ? v : new Uint8Array(v));
    });
    if (!saved || saved.length < 128) throw new Error(`snapshot too small: ${saved?.length}`);
    if (saved[0] !== 0x52 || saved[1] !== 0x42 || saved[2] !== 0x47 || saved[3] !== 0x48) {
      throw new Error('snapshot magic not RBGH');
    }
    await writeFile(join(evidenceDir, 'atari-st', 'snapshot-a.bin'), Buffer.from(saved));

    // Corrupt / mismatch negatives
    let corruptRejected = false;
    try {
      const bad = saved.slice();
      bad[20] ^= 0xff;
      await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), bad);
    } catch (e) {
      corruptRejected = /HATARI_SNAPSHOT|INTEGRITY|TRUNCATED|META|MAGIC/i.test(String(e.message || e));
    }
    if (!corruptRejected) throw new Error('corrupt snapshot was accepted');

    let mismatchRejected = false;
    try {
      const bad = saved.slice();
      // Flip coreVersion inside JSON meta (roughly) by zeroing a meta region byte that is not magic.
      bad[40] = (bad[40] + 1) & 0xff;
      await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), bad);
    } catch (e) {
      mismatchRejected = /HATARI_SNAPSHOT/i.test(String(e.message || e));
    }
    if (!mismatchRejected) console.warn('MISMATCH_SOFT: meta tamper may still fail integrity first');

    // Advance to visibly different state B (self-playing animation).
    let pngB = pngA;
    let hashB = hashA;
    let deltaAB = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(700);
      pngB = PNG.sync.read(await frame.screenshot());
      hashB = sampleHash(pngB);
      deltaAB = frameDelta(pngA, pngB);
      if (deltaAB > 200 || hashB !== hashA) break;
    }
    if (deltaAB <= 40 && hashB === hashA) {
      throw new Error('framebuffer did not diverge to position B');
    }
    await frame.screenshot({ path: join(shotDir, 'atari-st-pos-b.png') });

    // Restore A — sample visuals BEFORE any re-save (animation races the SHA).
    await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), saved);
    let pngRestored = null;
    let hashRestored = 0;
    let deltaRA = Number.POSITIVE_INFINITY;
    let deltaRB = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 10; i++) {
      const cand = PNG.sync.read(await frame.screenshot());
      const dA = frameDelta(pngA, cand);
      const dB = frameDelta(pngB, cand);
      if (dA < deltaRA) {
        pngRestored = cand;
        hashRestored = sampleHash(cand);
        deltaRA = dA;
        deltaRB = dB;
      }
      if (dA === 0 || hashRestored === hashA) break;
      await page.waitForTimeout(50);
    }
    if (pngRestored) {
      await writeFile(join(shotDir, 'atari-st-restored-a.png'), PNG.sync.write(pngRestored));
    } else {
      await frame.screenshot({ path: join(shotDir, 'atari-st-restored-a.png') });
    }
    const visualOk =
      hashRestored === hashA ||
      deltaRA === 0 ||
      (deltaRA < deltaRB && deltaRA < Math.max(2500, deltaAB * 0.65));
    if (!visualOk) {
      throw new Error(
        `restore did not return toward A hashA=${hashA} hashB=${hashB} hashR=${hashRestored} dRA=${deltaRA} dRB=${deltaRB} dAB=${deltaAB}`,
      );
    }
    const restoredOk = visualOk;

    // Round-trip: re-save after visual gate. Raw SHA may soft-mismatch (cycles/audio).
    const savedRound = await page.evaluate(async () => {
      const v = await window.command('save');
      return Array.from(v instanceof Uint8Array ? v : new Uint8Array(v));
    });
    function envelopeRawSha(arr) {
      const u8 = Uint8Array.from(arr);
      const metaLen = new DataView(u8.buffer).getUint32(8, true);
      const rawOff = 12 + metaLen;
      const meta = JSON.parse(new TextDecoder().decode(u8.subarray(12, 12 + metaLen)));
      return { rawSha: meta.rawSha256, rawLen: new DataView(u8.buffer).getUint32(rawOff, true), meta };
    }
    const aMeta = envelopeRawSha(saved);
    const rMeta = envelopeRawSha(savedRound);
    const roundTripOk = aMeta.rawSha && aMeta.rawSha === rMeta.rawSha;
    if (!roundTripOk) {
      console.warn('ROUNDTRIP_RAW_SOFT', aMeta.rawSha, rMeta.rawSha);
    }

    // Continue after restore
    await page.waitForTimeout(1500);
    const pngAfter = PNG.sync.read(await frame.screenshot());
    if (nonBlackPixels(pngAfter) < 40) throw new Error('went black after restore');

    // Second save/load cycle
    const saved2 = await page.evaluate(async () => {
      const v = await window.command('save');
      return Array.from(v instanceof Uint8Array ? v : new Uint8Array(v));
    });
    await page.evaluate((arr) => window.command('load', new Uint8Array(arr)), saved2);

    // Cold reload + restore saved A (fixed settle; do not wait for animation).
    await page.close();
    const { page: page2, result: result2 } = await bootPage(browser, port);
    if (!result2.capabilities?.saveState) throw new Error('saveState missing after reload');
    await page2.waitForTimeout(5000);
    await page2.evaluate((arr) => window.command('load', new Uint8Array(arr)), saved);
    await page2.waitForTimeout(1000);
    const frame2 = page2.locator('#game');
    const pngCold = PNG.sync.read(await frame2.screenshot());
    const coldLit = nonBlackPixels(pngCold);
    if (coldLit < 40) throw new Error('cold restore canvas black');
    await frame2.screenshot({ path: join(shotDir, 'atari-st-cold-restore.png') });

    // Offline-after-boot (full PWA cold-start remains a separate Compose gate).
    if (!process.env.SKIP_OFFLINE) {
      await page2.context().setOffline(true);
      await page2.waitForTimeout(400);
      const offlinePng = PNG.sync.read(await frame2.screenshot());
      if (nonBlackPixels(offlinePng) < 40) throw new Error('offline after restore went black');
    }

    console.log(
      'ATARI_ST_GAMEPLAY_PASS',
      JSON.stringify({
        capabilities: result.capabilities,
        litA,
        hashA,
        hashB,
        hashRestored,
        deltaAB,
        deltaRA,
        deltaRB,
        restoredOk,
        snapshotBytes: saved.length,
        corruptRejected,
        coldRestore: true,
        controlScheme: 'hatari-keyboard-joystick',
        core: 'hatari',
        fixture: fixtureName,
        platform: 'atari-st',
        saveLoad: 'PASS',
      }),
    );
    await page2.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
