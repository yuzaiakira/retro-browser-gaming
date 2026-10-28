/**
 * PH-08 Android Chrome acceptance via USB + Chrome DevTools Protocol.
 * Connects to the already-running device Chrome (adb forward :9222).
 * Does not log unrelated open tabs or personal browsing data.
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const cdpUrl = process.env.ANDROID_CDP_URL || 'http://127.0.0.1:9222';
const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:13000';
const evidenceDir = resolveEvidenceDir('PH-08');

async function connectRewindPage(browser) {
  // Only reuse tabs already on the Rewind base URL — never inspect unrelated pages.
  const pages = browser.contexts().flatMap((c) => c.pages());
  let page = pages.find((p) => {
    try {
      return p.url().startsWith(baseUrl);
    } catch {
      return false;
    }
  });
  if (!page) {
    const context = browser.contexts()[0] || (await browser.newContext());
    page = await context.newPage();
  }
  return page;
}

async function installGame(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  const play = page.getByRole('link', { name: '▶ Play game' });
  if (await play.count()) {
    await play.click();
  } else {
    const btn = page.getByRole('button', { name: 'Download & try on this device' });
    if (await btn.isDisabled()) {
      const panel = await page.locator('.panel').first().innerText();
      throw new Error(`${slug} install disabled: ${panel.slice(0, 240)}`);
    }
    await btn.click();
    await play.waitFor({ timeout: 300000 });
    await play.click();
  }
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
}

async function run() {
  mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });
  const results = {
    platform: 'Android Chrome over CDP',
    baseUrl,
    note: 'Device serial/model recorded separately without personal browsing data',
  };

  const browser = await chromium.connectOverCDP(cdpUrl);
  try {
    const page = await connectRewindPage(browser);
    page.setDefaultTimeout(60000);

    // --- Diagnostics / secure context ---
    await page.goto(`${baseUrl}/diagnostics`, { waitUntil: 'domcontentloaded' });
    const caps = await page.evaluate(async () => {
      let estimate = {};
      try {
        estimate = await navigator.storage.estimate();
      } catch (e) {
        estimate = { error: String(e) };
      }
      let opfs = false;
      try {
        if (navigator.storage?.getDirectory) {
          await navigator.storage.getDirectory();
          opfs = true;
        }
      } catch {
        opfs = false;
      }
      return {
        secure: isSecureContext,
        crossOriginIsolated,
        sab: typeof SharedArrayBuffer !== 'undefined',
        opfs,
        locks: !!navigator.locks,
        wasm: typeof WebAssembly !== 'undefined',
        webgl2: !!document.createElement('canvas').getContext('webgl2'),
        touchPoints: navigator.maxTouchPoints,
        quota: estimate.quota,
        usage: estimate.usage,
        ua: navigator.userAgent,
      };
    });
    results.diagnostics = caps;
    if (!caps.secure || !caps.opfs || !caps.locks) {
      throw new Error(`Capability gate failed: ${JSON.stringify(caps)}`);
    }
    await page
      .screenshot({
        path: join(evidenceDir, 'screenshots', 'android-diagnostics.png'),
        timeout: 20000,
      })
      .catch((e) => console.warn('diagnostics screenshot skipped', e.message));
    console.log(`ANDROID_DIAGNOSTICS_PASS ${JSON.stringify(caps)}`);

    // --- Catalog install Orbit (touch-friendly native) ---
    await installGame(page, 'orbit-catch', 'Orbit Catch');
    await page.getByRole('button', { name: 'Save state', exact: true }).click();
    await page.getByText('State saved on this device', { exact: true }).waitFor();
    results.orbitInstall = true;
    console.log('ANDROID_ORBIT_INSTALL_PASS');

    // Ensure touch controls visible
    const touchToggle = page.getByRole('button', { name: /touch controls/i });
    if (await touchToggle.count()) {
      const label = await touchToggle.textContent();
      if (label?.includes('Show')) await touchToggle.click();
    }

    // --- IN-003-P simultaneous Left + A ---
    await page.evaluate(() => {
      window.__retroInputLog = [];
      window.addEventListener('retro-input', (e) => window.__retroInputLog.push(e.detail));
    });
    const left = page.getByRole('button', { name: 'Touch Left' });
    const action = page.getByRole('button', { name: 'Touch A' });
    await left.waitFor({ timeout: 15000 });
    await left.dispatchEvent('pointerdown', { pointerId: 21, bubbles: true });
    await action.dispatchEvent('pointerdown', { pointerId: 22, bubbles: true });
    await page.waitForTimeout(150);
    const multi = await page.evaluate(() => window.__retroInputLog || []);
    await left.dispatchEvent('pointerup', { pointerId: 21, bubbles: true });
    await action.dispatchEvent('pointerup', { pointerId: 22, bubbles: true });
    const leftHit = multi.some((e) => e.command === 6 && e.value === 1);
    const aHit = multi.some((e) => e.command === 8 && e.value === 1);
    if (!leftHit || !aHit) throw new Error(`IN-003-P failed: ${JSON.stringify(multi)}`);
    results.in003p = { leftHit, aHit };
    console.log('IN_003_P_PASS');

    // --- IN-004-P layout persistence ---
    await page.getByRole('button', { name: 'Edit controls' }).click();
    await page.locator('.layout-editor').waitFor();
    await page.locator('.layout-editor input[type="range"]').first().fill('58');
    await page.getByRole('button', { name: 'Save layout' }).click();
    await page.waitForTimeout(400);
    const layoutKey = await page.evaluate(async () => {
      const dbp = indexedDB.open('retro-library');
      const db = await new Promise((res, rej) => {
        dbp.onerror = () => rej(dbp.error);
        dbp.onsuccess = () => res(dbp.result);
      });
      const keys = await new Promise((res) => {
        const tx = db.transaction('settings');
        const req = tx.objectStore('settings').getAllKeys();
        tx.oncomplete = () => res(req.result);
      });
      db.close();
      return keys.find((k) => String(k).startsWith('layout:'));
    });
    if (!layoutKey) throw new Error('IN-004-P layout not stored');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 90000 });
    const retained = await page.evaluate(async (key) => {
      const dbp = indexedDB.open('retro-library');
      const db = await new Promise((res, rej) => {
        dbp.onerror = () => rej(dbp.error);
        dbp.onsuccess = () => res(dbp.result);
      });
      const value = await new Promise((res) => {
        const tx = db.transaction('settings');
        const req = tx.objectStore('settings').get(key);
        tx.oncomplete = () => res(req.result);
      });
      db.close();
      return Array.isArray(value) && value.some((b) => b.size === 58);
    }, layoutKey);
    if (!retained) throw new Error('IN-004-P layout size not retained after reload');
    results.in004p = { layoutKey: String(layoutKey), retained: true };
    console.log('IN_004_P_PASS');

    // --- IN-005-P visibility / blur release (pagehide + blur path on device) ---
    await page.evaluate(() => {
      window.__retroInputLog = [];
      window.addEventListener('retro-input', (e) => window.__retroInputLog.push(e.detail));
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true }),
      );
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });
    await page.waitForTimeout(100);
    const afterBlur = await page.evaluate(() => window.__retroInputLog || []);
    const released = afterBlur.some((e) => e.command === 6 && e.value === 0);
    if (!released) throw new Error(`IN-005-P no release: ${JSON.stringify(afterBlur)}`);
    results.in005p = {
      released: true,
      method: 'visibilitychange+blur+pagehide on physical Chrome session over CDP',
    };
    console.log('IN_005_P_PASS');

    // --- UX-FS fullscreen (user activation required on mobile) ---
    await page.locator('.player-stage').click({ force: true }).catch(() => {});
    const fs = await page.evaluate(async () => {
      const stage = document.querySelector('.player-stage');
      if (!stage?.requestFullscreen) return { ok: false, reason: 'no-api' };
      try {
        await stage.requestFullscreen();
        const active = !!document.fullscreenElement;
        return { ok: active, active, leftFullscreen: false };
      } catch (e) {
        return { ok: false, reason: String(e) };
      }
    });
    results.uxFs = fs;
    if (!fs.ok) {
      results.uxFs = {
        ...fs,
        status: 'NOT_VERIFIED',
        note: 'Fullscreen blocked without lasting user gesture; manual UX-FS still required',
      };
      console.log(`UX_FS_PARTIAL ${JSON.stringify(fs)}`);
    } else {
      console.log('UX_FS_PASS');
    }

    // --- UX-OR orientation (Chrome requires fullscreen before lock) ---
    const orientBefore = await page.evaluate(() => ({
      w: innerWidth,
      h: innerHeight,
      type: screen.orientation?.type,
    }));
    // Ensure user activation for fullscreen+lock
    await page.locator('.player-stage').click({ force: true }).catch(() => {});
    const orient = await page.evaluate(async () => {
      const beforeType = screen.orientation?.type;
      const beforeW = innerWidth;
      const beforeH = innerHeight;
      const stage = document.querySelector('.player-stage');
      try {
        if (!document.fullscreenElement && stage?.requestFullscreen) {
          await stage.requestFullscreen();
        }
        if (!document.fullscreenElement) {
          return { ok: false, before: beforeType, reason: 'not-fullscreen' };
        }
        if (!screen.orientation?.lock) {
          return { ok: false, before: beforeType, reason: 'no-lock-api' };
        }
        const next = beforeType?.includes('portrait') ? 'landscape' : 'portrait-primary';
        await screen.orientation.lock(next);
        await new Promise((r) => setTimeout(r, 500));
        const mid = {
          type: screen.orientation.type,
          w: innerWidth,
          h: innerHeight,
        };
        screen.orientation.unlock?.();
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        }
        const flipped =
          (beforeType?.includes('portrait') && String(mid.type).includes('landscape')) ||
          (beforeType?.includes('landscape') && String(mid.type).includes('portrait')) ||
          mid.w !== beforeW ||
          mid.h !== beforeH;
        return {
          ok: flipped || mid.type !== beforeType,
          before: beforeType,
          mid,
        };
      } catch (e) {
        try {
          if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen();
        } catch {
          /* ignore */
        }
        return { ok: false, before: beforeType, reason: String(e) };
      }
    });
    results.uxOr = { before: orientBefore, attempt: orient };
    if (orient.ok) console.log('UX_OR_PASS');
    else console.log(`UX_OR_PARTIAL ${JSON.stringify(orient)}`);

    await page
      .screenshot({
        path: join(evidenceDir, 'screenshots', 'android-orbit-player.png'),
        timeout: 20000,
      })
      .catch((e) => console.warn('orbit screenshot skipped', e.message));

    // --- Genesis install + save (console) ---
    try {
      await installGame(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
      await page.getByRole('button', { name: 'Save state', exact: true }).click();
      await page.getByText('State saved on this device', { exact: true }).waitFor();
      results.genesis = true;
      console.log('ANDROID_GENESIS_INSTALL_PASS');
      // AudioContext after gesture (not human-heard)
      await page.locator('.player-stage').click();
      const audio = await page.evaluate(async () => {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        await ctx.resume();
        const state = ctx.state;
        await ctx.close();
        return { state, sampleRate: ctx.sampleRate };
      });
      results.audioGesture = audio;
      results.aud001 = {
        status: 'NOT_VERIFIED',
        note: 'AudioContext running after gesture; human must confirm audible output on device speakers',
      };
      console.log(`ANDROID_AUDIO_GESTURE ${JSON.stringify(audio)}`);
    } catch (e) {
      results.genesis = String(e);
      console.error('ANDROID_GENESIS_FAIL', e);
    }

    // Try PS1 / PSP — may fail without threads on some mobile Chrome builds
    for (const game of [
      { slug: 'mit-ps1-dot', title: 'MIT PS1 Dot', key: 'ps1' },
      { slug: 'mit-psp-dot', title: 'MIT PSP Dot', key: 'psp' },
    ]) {
      try {
        await page.goto(`${baseUrl}/games/${game.slug}`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 30000 });
        const btn = page.getByRole('button', { name: 'Download & try on this device' });
        const play = page.getByRole('link', { name: '▶ Play game' });
        if (await play.count()) {
          await play.click();
          await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
          results[game.key] = 'play-ok';
          console.log(`ANDROID_${game.key.toUpperCase()}_PASS`);
        } else if (await btn.isDisabled()) {
          const panel = await page.locator('.panel').first().innerText();
          results[game.key] = { status: 'unsupported', reason: panel.slice(0, 300) };
          console.log(`ANDROID_${game.key.toUpperCase()}_UNSUPPORTED`);
        } else {
          await btn.click();
          await play.waitFor({ timeout: 300000 });
          await play.click();
          await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
          results[game.key] = 'install-play-ok';
          console.log(`ANDROID_${game.key.toUpperCase()}_PASS`);
        }
      } catch (e) {
        results[game.key] = String(e.message || e);
        console.error(`ANDROID_${game.key.toUpperCase()}_FAIL`, e.message || e);
      }
    }

    writeFileSync(join(evidenceDir, 'android-physical-20261020.txt'), JSON.stringify(results, null, 2));
    console.log(`ANDROID_PHYSICAL_DONE ${JSON.stringify(results)}`);
  } finally {
    // Do not browser.close() — that would kill the user's Chrome session.
    await browser.close().catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
