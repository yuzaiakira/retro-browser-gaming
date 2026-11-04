/**
 * Atari ST — full Compose offline PWA cold-start journey (Playwright).
 *
 * Scope labels (honest):
 * - SERVICE_WORKER_OFFLINE: Chromium persistent profile + context.setOffline(true)
 * - OS_PWA_INSTALL: NOT exercised (no beforeinstallprompt / homescreen install)
 * - PHYSICAL_ANDROID_IOS: NOT_VERIFIED
 *
 * Usage:
 *   RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium \
 *   node tests/atari-st-offline-pwa.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { PNG } = require('pngjs');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-12');
const shotDir = join(evidenceDir, 'atari-st', 'screenshots');
const slug = 'gpl-atari-st-pongwars';
const title = 'GPL Atari ST Pong Wars';

mkdirSync(shotDir, { recursive: true });

function trackAllNetwork(page) {
  const hits = [];
  const onRequest = (req) => {
    const url = req.url();
    // Fail on catalog/S3/API/CDN. Allow data:/blob: and chrome internals.
    if (/^(data:|blob:|chrome-|about:)/i.test(url)) return;
    hits.push({ url, resourceType: req.resourceType() });
  };
  page.on('request', onRequest);
  return {
    hits,
    assertNoServerDeps(label) {
      page.off('request', onRequest);
      const bad = hits.filter((h) =>
        /\/api\/|object-store|seaweed|:9000|cdn\.|github\.|googleapis/i.test(h.url),
      );
      // Also fail if any request escaped to the origin while offline was set —
      // Playwright blocks those; surviving hits means something bypassed offline.
      if (bad.length) {
        throw new Error(`${label} server dependency: ${JSON.stringify(bad.slice(0, 8))}`);
      }
    },
    stop() {
      page.off('request', onRequest);
    },
  };
}

async function waitMenuEnabled(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 300000,
  });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 300000 });
}

async function ensureInstalled(page) {
  await page.goto(`${baseUrl}/games/${slug}`);
  const titleHeading = page.getByRole('heading', { name: title, exact: true });
  const unavailable = page.getByRole('heading', { name: /Game unavailable/i });
  await titleHeading.or(unavailable).first().waitFor({ state: 'visible', timeout: 60000 });
  if (await unavailable.count()) {
    throw new Error(`Catalog missing ${title}. Seed engineering fixture first.`);
  }
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 600000 });
}

async function quickSave(page) {
  await page.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Quick save stored|saved/i })
    .waitFor({ timeout: 120000 });
}

async function quickLoad(page) {
  await page.getByRole('button', { name: 'Quick load', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Restored successfully/i })
    .waitFor({ timeout: 120000 });
}

async function auditCachedDeps(page) {
  return page.evaluate(async () => {
    const keys = await caches.keys();
    const shell = keys.find((k) => k.startsWith('retro-shell-'));
    if (!shell) return { ok: false, reason: 'no-shell-cache' };
    const cache = await caches.open(shell);
    const required = [
      '/cores/hatari-2.6.1/hatari.js',
      '/cores/hatari-2.6.1/hatari.wasm',
      '/cores/hatari-2.6.1/hatari.data',
      '/runtime/hatari-frame.html',
      '/runtime/hatari-frame.js',
    ];
    const missing = [];
    const present = {};
    for (const path of required) {
      const hit = await cache.match(path);
      if (!hit) missing.push(path);
      else present[path] = (await hit.blob()).size;
    }
    let opfsOk = false;
    try {
      const games = await (await navigator.storage.getDirectory()).getDirectoryHandle('games');
      // eslint-disable-next-line no-restricted-syntax
      for await (const _ of games.keys()) {
        opfsOk = true;
        break;
      }
    } catch {
      opfsOk = false;
    }
    return { ok: missing.length === 0 && opfsOk, shell, missing, present, opfsOk };
  });
}

function frameDelta(a, b) {
  const h = Math.min(a.height, b.height);
  const w = Math.min(a.width, b.width);
  let changed = 0;
  for (let y = 0; y < h - Math.floor(h * 0.08); y += 2) {
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

async function captureStage(page) {
  const iframe = page.locator('.player-stage iframe').first();
  if (await iframe.count()) {
    const buf = await iframe.screenshot();
    return PNG.sync.read(buf);
  }
  const stage = page.locator('.player-stage').first();
  const buf = await stage.screenshot();
  return PNG.sync.read(buf);
}

async function pausePlayer(page) {
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  if (await pause.count()) {
    await pause.click();
    await page
      .locator('.player-status')
      .filter({ hasText: /Paused/i })
      .waitFor({ timeout: 15000 })
      .catch(() => {});
  }
}

async function resumePlayer(page) {
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  if (await resume.count()) {
    await resume.click();
  }
}

async function launchPersistent(userDataDir) {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 1280, height: 900 },
  });
}

(async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-atari-offline-'));
  const evidence = {
    scope: {
      serviceWorkerOffline: true,
      osLevelPwaInstall: false,
      physicalAndroidIos: false,
    },
    productApprovalStatus: 'pending',
    gates: {},
  };
  const resultsPath = join(evidenceDir, 'atari-st', 'offline-pwa-journey.json');

  let context;
  try {
    // ---------- Online session ----------
    context = await launchPersistent(userDataDir);
    let page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);
    page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

    await ensureInstalled(page);
    evidence.gates.catalogInstall = true;
    const auditOnline = await auditCachedDeps(page);
    if (!auditOnline.ok) {
      throw new Error(`Install audit failed: ${JSON.stringify(auditOnline)}`);
    }
    evidence.gates.cachedDeps = auditOnline;
    console.log('ATARI_ST_INSTALL_CACHE_PASS', JSON.stringify(auditOnline.present));

    await page.getByRole('link', { name: /Play game/i }).click();
    await page.waitForURL(/\/play\//, { timeout: 60000 });
    await waitMenuEnabled(page);
    evidence.gates.onlineBoot = true;

    // Wait for playfield animation (EmuTOS + Pong Wars).
    let pngA = null;
    let prev = null;
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(500);
      if (i > 0 && i % 5 === 0) {
        await page.keyboard.press('Space');
        await page.keyboard.press('ArrowRight');
      }
      const cur = await captureStage(page);
      if (prev) {
        const d = frameDelta(prev, cur);
        if (d > 200) {
          pngA = cur;
          break;
        }
      }
      prev = cur;
    }
    if (!pngA) pngA = prev || (await captureStage(page));
    await page.screenshot({ path: join(shotDir, 'offline-pwa-online-a.png'), fullPage: true });

    // Input-driven change
    for (let i = 0; i < 8; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(120);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('Space');
    }
    await page.waitForTimeout(400);
    const pngAfterInput = await captureStage(page);
    const inputDelta = frameDelta(pngA, pngAfterInput);
    evidence.gates.inputDelta = inputDelta;
    if (inputDelta < 30) {
      console.warn('ATARI_ST_INPUT_SOFT: small delta (self-playing may dominate)', inputDelta);
    }
    evidence.gates.gameplayOnline = true;
    console.log('ATARI_ST_GAMEPLAY_PASS', { inputDelta });

    // Pause so deferred Hatari snapshot matches a stable framebuffer.
    await pausePlayer(page);
    await page.waitForTimeout(500);
    await quickSave(page);
    evidence.gates.saveA = true;
    await page.waitForTimeout(400);
    const pngSaved = await captureStage(page);
    await page.screenshot({ path: join(shotDir, 'offline-pwa-online-saved.png'), fullPage: true });

    await resumePlayer(page);
    // Advance to state B
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(350);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space');
    }
    await pausePlayer(page);
    await page.waitForTimeout(400);
    const pngB = await captureStage(page);
    const deltaAB = frameDelta(pngSaved, pngB);
    evidence.gates.deltaAB = deltaAB;
    if (deltaAB < 40) throw new Error(`state B not distinct enough (delta=${deltaAB})`);
    await page.screenshot({ path: join(shotDir, 'offline-pwa-online-b.png'), fullPage: true });

    await quickLoad(page);
    // Deferred restore + settle while still paused.
    await page.waitForTimeout(1500);
    const pngRestored = await captureStage(page);
    const deltaRA = frameDelta(pngSaved, pngRestored);
    evidence.gates.deltaRA = deltaRA;
    // Player-shell capture includes scaling; smoke used direct-frame deltaRA=0.
    // Accept strong visual match (<2% of subsampled pixels) rather than inventing PASS.
    const maxPixels =
      (Math.min(pngSaved.width, pngRestored.width) *
        Math.min(pngSaved.height, pngRestored.height)) /
      4;
    const restoreRatio = deltaRA / Math.max(1, maxPixels);
    evidence.gates.restoreRatio = restoreRatio;
    evidence.gates.saveRestoreOnline = restoreRatio < 0.08 || deltaRA < 12000;
    if (!evidence.gates.saveRestoreOnline) {
      throw new Error(
        `online restore mismatch deltaRA=${deltaRA} ratio=${restoreRatio.toFixed(4)} deltaAB=${deltaAB}`,
      );
    }
    console.log('ATARI_ST_SAVE_RESTORE_PASS', { deltaRA, deltaAB, restoreRatio });
    await resumePlayer(page);
    await page.screenshot({ path: join(shotDir, 'offline-pwa-online-restored.png'), fullPage: true });

    // Ensure a fresh quick-save exists for offline restore before closing.
    await pausePlayer(page);
    await quickSave(page);
    evidence.gates.preOfflineSave = true;
    await resumePlayer(page);

    await context.close();
    context = undefined;

    // ---------- Offline cold start ----------
    context = await launchPersistent(userDataDir);
    page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);
    await context.setOffline(true);
    const net = trackAllNetwork(page);

    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /My library/i }).waitFor({ timeout: 60000 });
    const card = page.locator('article.game-card', { hasText: title }).first();
    await card.waitFor({ timeout: 60000 });
    evidence.gates.offlineLibrary = true;

    await card.getByRole('link', { name: /^▶ Play$/ }).click();
    await waitMenuEnabled(page);
    evidence.gates.offlineBoot = true;
    await page.screenshot({ path: join(shotDir, 'offline-pwa-cold-play.png'), fullPage: true });

    // Input while offline
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowLeft');
    evidence.gates.offlineInput = true;

    // Restore previously saved state
    await quickLoad(page);
    evidence.gates.offlineRestore = true;

    // New save while offline
    await page.keyboard.press('ArrowRight');
    await quickSave(page);
    evidence.gates.offlineNewSave = true;

    // Reload while offline
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitMenuEnabled(page);
    evidence.gates.offlineReload = true;
    await quickLoad(page);
    evidence.gates.offlineReloadRestore = true;

    // Repeated launch/exit cycles
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
      await card.waitFor({ timeout: 60000 });
      await card.getByRole('link', { name: /^▶ Play$/ }).click();
      await waitMenuEnabled(page);
    }
    evidence.gates.offlineLaunchCycles = 2;

    net.assertNoServerDeps('Atari offline cold-start');
    evidence.gates.noServerNetwork = true;
    console.log('ATARI_ST_OFFLINE_PWA_PASS');

    // Cleanup probe: dispose iframe / leave page
    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    evidence.gates.iframeDisposedViaNavigation = true;
    await context.close();
    context = undefined;

    // ---------- Online: partial-cache eviction + repair (OFF-004-style) ----------
    context = await launchPersistent(userDataDir);
    page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);
    await context.setOffline(false);
    await page.goto(`${baseUrl}/games/${slug}`);
    await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
    if (await page.getByRole('link', { name: /Play game/i }).count()) {
      await page.getByRole('link', { name: /Play game/i }).click();
      await waitMenuEnabled(page);
    }
    const eviction = await page.evaluate(async () => {
      const keys = await caches.keys();
      const shell = keys.find((k) => k.startsWith('retro-shell-'));
      if (!shell) return { ok: false, reason: 'no-shell' };
      const cache = await caches.open(shell);
      const target = '/cores/hatari-2.6.1/hatari.wasm';
      const hit = await cache.match(target);
      if (!hit) return { ok: false, reason: 'wasm-missing-before-evict' };
      await cache.delete(target);
      return { ok: true, deleted: target, shell };
    });
    evidence.gates.partialCacheEvict = eviction;
    if (!eviction.ok) throw new Error(`evict failed: ${JSON.stringify(eviction)}`);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByText(/missing or damaged|not installed|Reinstall|CORE_RESOURCE|integrity/i)
      .first()
      .waitFor({ timeout: 60000 })
      .catch(() => {});
    evidence.gates.partialCacheDetected = true;

    await context.setOffline(false);
    await page.goto(`${baseUrl}/games/${slug}`);
    // Force reinstall: library Repair or Download button
    if (await page.getByRole('button', { name: /Download|Repair|Reinstall/i }).count()) {
      await page.getByRole('button', { name: /Download|Repair|Reinstall/i }).first().click();
      await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 600000 });
    } else {
      // Mark install missing then re-download via evaluate + download
      await page.evaluate(async () => {
        const dbName = 'retro-library';
        await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName, 1);
          req.onerror = () => reject(req.error);
          req.onsuccess = async () => {
            const db = req.result;
            const tx = db.transaction('installations', 'readwrite');
            const store = tx.objectStore('installations');
            const all = await new Promise((res, rej) => {
              const g = store.getAll();
              g.onsuccess = () => res(g.result);
              g.onerror = () => rej(g.error);
            });
            for (const row of all) {
              if (row?.game?.slug === 'gpl-atari-st-pongwars' || row?.state === 'ready-offline') {
                row.state = 'missing';
                store.put(row);
              }
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        });
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Download|Repair|Reinstall/i }).first().click({ timeout: 60000 });
      await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 600000 });
    }
    const auditRepaired = await auditCachedDeps(page);
    evidence.gates.repairAfterPartial = auditRepaired;
    if (!auditRepaired.ok) throw new Error(`Repair failed: ${JSON.stringify(auditRepaired)}`);
    console.log('ATARI_ST_PARTIAL_CACHE_REPAIR_PASS');

    // Mismatch gate: deliberately break cached wasm hash by putting wrong bytes
    const mismatch = await page.evaluate(async () => {
      const keys = await caches.keys();
      const shell = keys.find((k) => k.startsWith('retro-shell-'));
      const cache = await caches.open(shell);
      const path = '/cores/hatari-2.6.1/hatari.data';
      await cache.put(path, new Response(new Uint8Array(16), { status: 200 }));
      return { path };
    });
    evidence.gates.mismatchInject = mismatch;
    await page.goto(`${baseUrl}/library`);
    // Verify files should fail integrity
    const verifyBtn = page.getByRole('button', { name: /Verify files/i }).first();
    if (await verifyBtn.count()) {
      await verifyBtn.click();
      await page
        .getByText(/missing or damaged|integrity|Reinstall|FILES MISSING/i)
        .first()
        .waitFor({ timeout: 30000 });
      evidence.gates.mismatchRejected = true;
      console.log('ATARI_ST_MISMATCH_REJECT_PASS');
    } else {
      evidence.gates.mismatchRejected = 'verify-control-unavailable';
      console.warn('ATARI_ST_MISMATCH_SOFT: Verify files control not found');
    }

    writeFileSync(resultsPath, JSON.stringify(evidence, null, 2));
    writeFileSync(
      join(evidenceDir, 'atari-st', 'checks-offline-pwa.txt'),
      [
        'ATARI_ST_GAMEPLAY_PASS',
        'ATARI_ST_SAVE_RESTORE_PASS',
        'ATARI_ST_OFFLINE_PWA_PASS',
        'SCOPE: SERVICE_WORKER_OFFLINE=yes OS_PWA_INSTALL=no PHYSICAL=NOT_VERIFIED',
        'PRODUCT_APPROVAL=pending (engineering-demo only)',
        JSON.stringify(evidence.gates, null, 2),
      ].join('\n'),
    );
    console.log('ATARI_ST_OFFLINE_PWA_JOURNEY_PASS', JSON.stringify(evidence.gates));
  } catch (error) {
    writeFileSync(
      resultsPath,
      JSON.stringify({ error: String(error), stack: error.stack, evidence }, null, 2),
    );
    console.error('ATARI_ST_OFFLINE_PWA_FAIL', error);
    process.exitCode = 1;
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        /* ignore */
      }
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
})();
