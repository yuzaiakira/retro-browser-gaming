/**
 * Flash/Ruffle Compose offline PWA cold-start (Playwright).
 * Marker: FLASH_RUFFLE_OFFLINE_PWA_PASS
 * Scope: SERVICE_WORKER_OFFLINE only — not OS PWA / physical devices.
 *
 * Usage:
 *   RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium \
 *   node tests/flash-offline-pwa.cjs
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
const shotDir = join(evidenceDir, 'flash', 'screenshots');
const slug = 'mit-flash-dot';
const title = 'MIT Flash Dot';

mkdirSync(shotDir, { recursive: true });

function trackAllNetwork(page) {
  const hits = [];
  const onRequest = (req) => {
    const url = req.url();
    if (/^(data:|blob:|chrome-|about:)/i.test(url)) return;
    hits.push({ url, resourceType: req.resourceType() });
  };
  page.on('request', onRequest);
  return {
    assertNoServerDeps(label) {
      page.off('request', onRequest);
      const bad = hits.filter((h) =>
        /\/api\/|object-store|seaweed|:9000|cdn\.|github\.|googleapis|unpkg/i.test(h.url),
      );
      if (bad.length) {
        throw new Error(`${label} server dependency: ${JSON.stringify(bad.slice(0, 8))}`);
      }
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
    throw new Error(`Catalog missing ${title}. Seed mit-flash-dot first.`);
  }
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 600000 });
}

async function auditCachedDeps(page) {
  return page.evaluate(async () => {
    const keys = await caches.keys();
    const shell = keys.find((k) => k.startsWith('retro-shell-'));
    if (!shell) return { ok: false, reason: 'no-shell-cache' };
    const cache = await caches.open(shell);
    const required = [
      '/runtime/ruffle-frame.html',
      '/runtime/ruffle-boot.js',
      '/runtime/ruffle-frame.js',
    ];
    const missing = [];
    const present = {};
    for (const path of required) {
      const hit = await cache.match(path);
      if (!hit) missing.push(path);
      else present[path] = (await hit.blob()).size;
    }
    const coreHits = (await cache.keys())
      .map((r) => new URL(r.url).pathname)
      .filter((p) => p.includes('ruffle-0.7.1'));
    if (!coreHits.some((p) => p.endsWith('ruffle.js'))) missing.push('ruffle.js');
    if (!coreHits.some((p) => p.endsWith('.wasm'))) missing.push('ruffle.wasm');
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
    return { ok: missing.length === 0 && opfsOk, shell, missing, present, coreHits, opfsOk };
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
  if (await iframe.count()) return PNG.sync.read(await iframe.screenshot());
  return PNG.sync.read(await page.locator('.player-stage').first().screenshot());
}

async function launchPersistent(userDataDir) {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
    viewport: { width: 1280, height: 900 },
  });
}

(async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-flash-offline-'));
  const evidence = {
    scope: {
      serviceWorkerOffline: true,
      osLevelPwaInstall: false,
      physicalAndroidIos: false,
    },
    productApprovalStatus: 'pending',
    saveSemantics: {
      libretroSaveState: false,
      sharedObject: true,
      quickSaveUi: false,
    },
    gates: {},
  };
  const resultsPath = join(evidenceDir, 'flash', 'offline-pwa-journey.json');
  let context;

  try {
    context = await launchPersistent(userDataDir);
    let page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);
    page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

    await ensureInstalled(page);
    evidence.gates.catalogInstall = true;
    const auditOnline = await auditCachedDeps(page);
    if (!auditOnline.ok) throw new Error(`Install audit failed: ${JSON.stringify(auditOnline)}`);
    evidence.gates.cachedDeps = auditOnline;
    console.log('FLASH_INSTALL_CACHE_PASS', JSON.stringify(auditOnline.coreHits?.slice?.(0, 8)));

    await page.getByRole('link', { name: /Play game/i }).click();
    await page.waitForURL(/\/play\//, { timeout: 60000 });
    await waitMenuEnabled(page);
    evidence.gates.onlineBoot = true;
    await page.waitForTimeout(4000);
    await page.screenshot({ path: join(shotDir, 'offline-pwa-online-boot.png'), fullPage: true });

    await page.locator('.player-stage').first().click({ position: { x: 40, y: 40 } }).catch(() => {});
    await page.waitForTimeout(200);
    const pngIdle = await captureStage(page);
    for (let i = 0; i < 20; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(80);
      await page.keyboard.up('ArrowRight');
    }
    await page.waitForTimeout(400);
    const pngMoved = await captureStage(page);
    evidence.gates.deltaOnline = frameDelta(pngIdle, pngMoved);
    evidence.gates.gameplayOnline = evidence.gates.deltaOnline > 40;

    // SharedObject progress (not Quick save)
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(60);
    }
    evidence.gates.progressOnline = true;

    await context.close();
    context = null;

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
    await page.waitForTimeout(6000);
    await page.screenshot({ path: join(shotDir, 'offline-pwa-cold-boot.png'), fullPage: true });

    // Focus player stage so InputRouter receives keys (iframe alone may steal without shell mapping).
    const stage = page.locator('.player-stage').first();
    await stage.click({ position: { x: 40, y: 40 } }).catch(() => {});
    await page.waitForTimeout(200);
    const offlineIdle = await captureStage(page);
    for (let i = 0; i < 18; i++) {
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(70);
      await page.keyboard.up('ArrowLeft');
    }
    await page.waitForTimeout(400);
    const offlineMoved = await captureStage(page);
    evidence.gates.deltaOffline = frameDelta(offlineIdle, offlineMoved);
    evidence.gates.offlineInput = evidence.gates.deltaOffline > 20;

    // Progress key still present offline
    const so = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.includes('rbg_mit_flash_dot')),
    );
    evidence.gates.offlineSharedObjectKeys = so;
    evidence.gates.offlineProgress = so.length > 0;

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitMenuEnabled(page);
    evidence.gates.offlineReload = true;

    for (let cycle = 0; cycle < 2; cycle++) {
      await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
      await card.waitFor({ timeout: 60000 });
      await card.getByRole('link', { name: /^▶ Play$/ }).click();
      await waitMenuEnabled(page);
    }
    evidence.gates.offlineLaunchCycles = 2;

    net.assertNoServerDeps('Flash offline cold-start');
    evidence.gates.noServerNetwork = true;

    const pass =
      evidence.gates.catalogInstall &&
      evidence.gates.onlineBoot &&
      evidence.gates.gameplayOnline &&
      evidence.gates.offlineBoot &&
      evidence.gates.offlineInput &&
      evidence.gates.offlineProgress &&
      evidence.gates.noServerNetwork;
    evidence.marker = pass ? 'FLASH_RUFFLE_OFFLINE_PWA_PASS' : 'FLASH_RUFFLE_OFFLINE_PWA_FAIL';
    console.log(evidence.marker, JSON.stringify(evidence.gates));
    writeFileSync(resultsPath, JSON.stringify(evidence, null, 2) + '\n');
    if (!pass) process.exitCode = 1;
  } catch (err) {
    evidence.error = String(err && err.stack ? err.stack : err);
    evidence.marker = 'FLASH_RUFFLE_OFFLINE_PWA_FAIL';
    writeFileSync(resultsPath, JSON.stringify(evidence, null, 2) + '\n');
    console.error('FLASH_RUFFLE_OFFLINE_PWA_FAIL', err);
    process.exitCode = 1;
  } finally {
    try {
      await context?.close();
    } catch {
      /* ignore */
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
})();
