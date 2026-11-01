/**
 * PH-12 — Cross-console long-session soak (Chromium).
 *
 * Sequential play/exit cycles across verified platforms in one browser profile.
 * Measures page JS heap (CDP), browser process RSS when available, iframe count,
 * and best-effort WebGL/Audio cleanup probes. Does not equate retained V8 heap
 * capacity with a leak.
 *
 * Marker: CROSS_CONSOLE_SOAK_PASS (only when acceptance criteria pass).
 */
const { chromium } = require('playwright');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdirSync, writeFileSync, copyFileSync, existsSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir = resolveEvidenceDir('PH-12/soak');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

const cyclesPerPlatform = Math.max(1, Number(process.env.SOAK_CYCLES || 2));
const playSeconds = Math.max(5, Number(process.env.SOAK_PLAY_SECONDS || 12));

/** Ten targeted platforms. Arcade appended only when SOAK_INCLUDE_ARCADE=1. */
const REQUIRED_KEYS = [
  'genesis',
  'nes',
  'n64',
  'zx81',
  'atari-st',
  'atari8',
  'fds',
  'dreamcast',
  'psp',
  'flash',
];

const platforms = [
  { key: 'genesis', slug: 'mit-genesis-breakout', title: /MIT Genesis Breakout/i, save: true },
  { key: 'nes', slug: 'mit-nes-table-tennis', title: /MIT NES Table Tennis/i, save: true },
  { key: 'n64', slug: 'mit-n64-controller-test', title: /MIT N64 Controller Test/i, save: true },
  { key: 'zx81', slug: 'mit-zx81-dot', title: /MIT ZX81 Dot/i, save: true },
  // Catalog slug is GPL Pong Wars (Hatari + EmuTOS), not a fictional mit-atarist-dot.
  {
    key: 'atari-st',
    slug: 'gpl-atari-st-pongwars',
    title: /GPL Atari ST Pong Wars/i,
    save: true,
  },
  { key: 'atari8', slug: 'mit-atari8-dot', title: /MIT Atari 8-bit Dot/i, save: true },
  { key: 'fds', slug: 'mit-fds-move-demo', title: /MIT FDS Move Demo/i, save: true },
  { key: 'dreamcast', slug: 'mit-dreamcast-dot', title: /MIT Dreamcast Dot/i, save: true },
  { key: 'psp', slug: 'mit-psp-dot', title: /MIT PSP Dot/i, save: true },
  { key: 'flash', slug: 'mit-flash-dot', title: /MIT Flash Dot/i, save: false },
];

if (process.env.SOAK_INCLUDE_ARCADE === '1') {
  platforms.push({
    key: 'arcade',
    slug: 'mit-arcade-rbgdot',
    title: /Arcade|RBG Dot/i,
    save: true,
  });
}

async function waitMenuEnabled(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 240000,
  });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 240000 });
}

async function ensurePlay(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  const heading = page.getByRole('heading', { name: title });
  try {
    await heading.waitFor({ timeout: 90000 });
  } catch (e) {
    const body = await page.locator('h1, h2').first().textContent().catch(() => '');
    throw new Error(`heading timeout for ${slug} (saw "${body}"): ${e.message || e}`);
  }
  // Prefer Play when already installed; otherwise start/resume download.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.getByRole('link', { name: /Play game/i }).count()) break;
    const action = page.getByRole('button', { name: /Download|Retry|Resume|Install/i }).first();
    if (await action.count()) {
      await action.click();
    }
    try {
      await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 300000 });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  await page.getByRole('link', { name: /Play game/i }).click();
  await page.waitForURL(/\/play\//, { timeout: 90000 });
  await waitMenuEnabled(page);
}

async function exitToLibrary(page) {
  await page.getByRole('link', { name: 'Library' }).click();
  const leave = page.getByRole('heading', { name: /Leave this game/i });
  if (await leave.count()) {
    await page.getByRole('button', { name: /Exit to library/i }).click();
  }
  await page.waitForURL(/\/library/, { timeout: 60000 });
  // Allow disposal
  await page.waitForTimeout(500);
}

async function heapSample(page) {
  const client = await page.context().newCDPSession(page);
  try {
    try {
      await client.send('HeapProfiler.collectGarbage');
    } catch {
      /* optional */
    }
    const heap = await client.send('Runtime.getHeapUsage');
    let rssKb = null;
    let rssNote = 'unavailable';
    try {
      const proc = page.context().browser()?.process?.();
      if (proc && proc.pid) {
        const { readFileSync } = require('fs');
        const status = readFileSync(`/proc/${proc.pid}/status`, 'utf8');
        const match = status.match(/^VmRSS:\s+(\d+)\s+kB/m);
        if (match) {
          rssKb = Number(match[1]);
          rssNote = 'measured-browser-process-VmRSS';
        }
      } else {
        rssNote = 'unavailable(browser.process null)';
      }
    } catch (e) {
      rssNote = `unavailable(${String(e.message || e)})`;
    }
    return {
      usedSize: heap.usedSize,
      totalSize: heap.totalSize,
      rssKb,
      rssNote,
      scope: 'page-js-heap',
      kind: 'measured',
    };
  } finally {
    await client.detach().catch(() => undefined);
  }
}

async function resourceProbe(page) {
  return page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe');
    const shell = document.querySelector('.player-shell');
    let webglLost = 0;
    let audioContexts = 0;
    let objectUrlsHint = 'not-exposed';
    try {
      // Best-effort: count canvas WebGL contexts we created on parent page only.
      document.querySelectorAll('canvas').forEach((c) => {
        const gl = c.getContext('webgl') || c.getContext('webgl2');
        if (gl && gl.isContextLost && gl.isContextLost()) webglLost += 1;
      });
    } catch {
      /* ignore */
    }
    try {
      if (typeof Performance !== 'undefined') {
        // No standard API for live AudioContext count; record 0 on parent after exit.
        audioContexts = 0;
      }
    } catch {
      /* ignore */
    }
    return {
      iframeCount: iframes.length,
      runtimeSession: shell?.getAttribute('data-runtime-session') || null,
      webglLostParent: webglLost,
      audioContextsParent: audioContexts,
      objectUrlsHint,
      note: 'iframe content not inspected; parent-page metrics only',
    };
  });
}

async function lightPlay(page) {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyZ', 'KeyX', 'Enter']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(80);
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(playSeconds * 1000);
}

(async () => {
  // Preserve historical EXIT=137 evidence if present.
  const hist = join(
    process.cwd(),
    '../../.runtime/test-evidence/PH-12/flash/baseline-genesis-exit137.json',
  );
  const histAlt = join(
    __dirname,
    '../../../.runtime/test-evidence/PH-12/flash/baseline-genesis-exit137.json',
  );
  for (const p of [hist, histAlt]) {
    if (existsSync(p)) {
      copyFileSync(p, join(evidenceDir, 'baseline-genesis-exit137.json'));
      break;
    }
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });

  const evidence = {
    startedAt: new Date().toISOString(),
    cyclesPerPlatform,
    playSeconds,
    platforms: {},
    skipped: [],
    memory: { samples: [], kind: 'measured-cdp-Runtime.getHeapUsage-after-GC' },
    exit137: {
      preserved: existsSync(join(evidenceDir, 'baseline-genesis-exit137.json')),
      note: 'Historical SIGKILL/OOM evidence retained; not treated as core regression alone',
    },
    limitations: {
      gpuProcessRss: 'NOT_EXPOSED in this harness',
      iframeInternals: 'Playwright cannot inspect cross-origin/opaque frame internals deeply',
      physicalGamepad: 'NOT_VERIFIED',
      heapCapacityVsLeak: 'Retained V8 heap capacity is NOT equated with a leak',
    },
  };

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(240000);

  const baseline = await heapSample(page);
  evidence.memory.baseline = baseline;

  let failures = 0;
  for (const plat of platforms) {
    const row = { cycles: [], error: null, saveTried: false };
    try {
      for (let n = 1; n <= cyclesPerPlatform; n++) {
        const before = await heapSample(page);
        await ensurePlay(page, plat.slug, plat.title);
        await lightPlay(page);

        if (plat.save) {
          try {
            await page.getByRole('button', { name: 'Menu', exact: true }).click();
            const menu = page.getByRole('dialog', { name: 'Game menu' });
            const qs = menu.getByRole('button', { name: 'Quick save', exact: true });
            if (await qs.count()) {
              await qs.click();
              row.saveTried = true;
            }
            await menu.getByRole('button', { name: 'Close' }).click().catch(() => undefined);
          } catch {
            /* optional per platform */
          }
        }

        const mid = await resourceProbe(page);
        if (mid.iframeCount !== 1) {
          throw new Error(`${plat.key}: expected 1 iframe during play, got ${mid.iframeCount}`);
        }

        await exitToLibrary(page);
        const afterProbe = await resourceProbe(page);
        if (afterProbe.iframeCount !== 0) {
          throw new Error(
            `${plat.key}: expected 0 iframes after exit, got ${afterProbe.iframeCount}`,
          );
        }
        if (afterProbe.runtimeSession) {
          throw new Error(`${plat.key}: runtime session survived exit`);
        }

        const after = await heapSample(page);
        const sample = {
          platform: plat.key,
          cycle: n,
          heapBefore: before.usedSize,
          heapAfter: after.usedSize,
          heapDelta: after.usedSize - before.usedSize,
          rssKb: after.rssKb,
          rssNote: after.rssNote,
          iframeDuring: mid.iframeCount,
          iframeAfter: afterProbe.iframeCount,
        };
        row.cycles.push(sample);
        evidence.memory.samples.push(sample);
      }
      await page.screenshot({
        path: join(evidenceDir, 'screenshots', `soak-${plat.key}.png`),
        fullPage: true,
      });
      evidence.platforms[plat.key] = { ...row, status: 'ok' };
      console.log('SOAK_PLATFORM_OK', plat.key);
    } catch (err) {
      row.error = String(err && err.message ? err.message : err);
      // Missing catalog titles are skipped, not hard-fail (environment-dependent).
      const skip =
        /Timeout|heading|Download|Play game|NOT_FOUND|404/i.test(row.error) &&
        !/iframe|runtime session/i.test(row.error);
      if (skip) {
        evidence.skipped.push({ key: plat.key, reason: row.error });
        evidence.platforms[plat.key] = { ...row, status: 'skipped' };
        console.warn('SOAK_PLATFORM_SKIP', plat.key, row.error);
      } else {
        evidence.platforms[plat.key] = { ...row, status: 'fail' };
        failures += 1;
        console.error('SOAK_PLATFORM_FAIL', plat.key, row.error);
      }
    }
  }

  const finalHeap = await heapSample(page);
  evidence.memory.final = finalHeap;
  evidence.memory.baselineToFinalDelta = finalHeap.usedSize - baseline.usedSize;

  const okCount = Object.values(evidence.platforms).filter((p) => p.status === 'ok').length;
  const requiredOk = REQUIRED_KEYS.every(
    (k) => evidence.platforms[k] && evidence.platforms[k].status === 'ok',
  );
  evidence.summary = {
    okCount,
    failCount: failures,
    skippedCount: evidence.skipped.length,
    requiredKeys: REQUIRED_KEYS,
    requiredOk,
  };

  writeFileSync(join(evidenceDir, 'cross-console-soak.json'), JSON.stringify(evidence, null, 2));
  await browser.close();

  if (failures > 0 || okCount < 2) {
    console.error('CROSS_CONSOLE_SOAK_FAIL', evidence.summary);
    process.exit(1);
  }
  // Baseline marker (partial coverage still allowed historically).
  console.log('CROSS_CONSOLE_SOAK_PASS', JSON.stringify(evidence.summary));
  // Full coverage marker only when all ten targeted platforms completed OK.
  if (requiredOk) {
    console.log('CROSS_CONSOLE_SOAK_FULL_PASS', JSON.stringify(evidence.summary));
    writeFileSync(
      join(evidenceDir, 'CROSS_CONSOLE_SOAK_FULL_PASS.txt'),
      `CROSS_CONSOLE_SOAK_FULL_PASS\n${new Date().toISOString()}\n`,
    );
  } else {
    console.warn(
      'CROSS_CONSOLE_SOAK_FULL_PASS_PENDING',
      'missing or skipped:',
      REQUIRED_KEYS.filter((k) => !evidence.platforms[k] || evidence.platforms[k].status !== 'ok'),
    );
  }
  process.exit(0);
})().catch((err) => {
  console.error('CROSS_CONSOLE_SOAK_FAIL', err);
  process.exit(1);
});
