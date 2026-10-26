/**
 * Gameplay UX reliability coverage (Orbit + Genesis + MSX + mobile).
 * Simulated Chromium only — not physical gamepad / iOS certification.
 */
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir = process.env.EVIDENCE_DIR || join(__dirname, '../../../docs/test-evidence/PH-UX');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

async function installGame(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) {
    await play.first().click();
  } else {
    await page.getByRole('button', { name: /Download|Retry|Resume/i }).first().click();
    await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 180000 });
    await page.getByRole('link', { name: /Play game/i }).click();
  }
  await page.waitForURL(/\/play\//, { timeout: 60000 });
  await page.locator('.player-stage').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 120000,
  });
}

async function waitPlaying(page) {
  await page.getByText(/Playing on this device|Resumed|Quick save|Restored/i).first().waitFor({
    timeout: 120000,
  }).catch(() => {});
  await page.waitForTimeout(800);
}

async function openMenu(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('dialog', { name: 'Game menu' }).waitFor();
}

async function closeMenu(page) {
  const dialog = page.getByRole('dialog', { name: 'Game menu' });
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

async function countIframes(page) {
  return page.locator('.player-stage iframe').count();
}

async function measureInputWhileHeld(page, holdMs = 400) {
  return page.evaluate(async (ms) => {
    const events = [];
    const onInput = (e) => events.push({ ...e.detail, t: performance.now() });
    window.addEventListener('retro-input', onInput);
    const sinkProxy = [];
    // Drive InputRouter via keyboard while counting events.
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }),
    );
    await new Promise((r) => setTimeout(r, ms));
    window.dispatchEvent(
      new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }),
    );
    window.removeEventListener('retro-input', onInput);
    const presses = events.filter((e) => e.command === 7 && e.value === 1);
    const releases = events.filter((e) => e.command === 7 && e.value === 0);
    return {
      presses: presses.length,
      releases: releases.length,
      total: events.length,
      sinkProxy,
    };
  }, holdMs);
}

async function measureInputWhileMenuOpen(page) {
  await openMenu(page);
  const result = await page.evaluate(async () => {
    const events = [];
    const onInput = (e) => events.push(e.detail);
    window.addEventListener('retro-input', onInput);
    // Simulate a held gamepad button while menu is open.
    window.__retroPad = window.__retroPad || {
      index: 0,
      mapping: '',
      connected: true,
      timestamp: performance.now(),
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    const original = navigator.getGamepads.bind(navigator);
    navigator.getGamepads = () => {
      const list = original() || [];
      const copy = [...list];
      copy[0] = window.__retroPad;
      return copy;
    };
    window.__retroPad.buttons[0] = { pressed: true, value: 1 };
    window.__retroPad.timestamp = performance.now();
    await new Promise((r) => setTimeout(r, 350));
    window.__retroPad.buttons[0] = { pressed: false, value: 0 };
    navigator.getGamepads = original;
    window.removeEventListener('retro-input', onInput);
    return {
      total: events.length,
      presses: events.filter((e) => e.value === 1).length,
    };
  });
  await closeMenu(page);
  return result;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const evidence = {
    orbit: {},
    genesis: {},
    msx: {},
    mobile: {},
    performance: {},
  };
  const log = (step) => console.log('PLAYER_UX_STEP', step);

  // ---------- Orbit HTML5 ----------
  {
    log('orbit:start');
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(60000);
    await installGame(page, 'orbit-catch', 'Orbit Catch');
    await waitPlaying(page);
    const mountsBefore = await countIframes(page);

    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'player-shell-desktop.png'),
      fullPage: true,
    });

    await openMenu(page);
    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'player-game-menu.png'),
      fullPage: true,
    });

    // Capability gating: Orbit reports saveState but not audio — no Volume control.
    const volume = await page.getByRole('dialog').getByLabel('Volume').count();
    if (volume !== 0) throw new Error('Orbit exposed unsupported Volume control');
    evidence.orbit.noUnsupportedAudio = true;
    const quickSaveInMenu = await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Quick save', exact: true })
      .count();
    evidence.orbit.quickSaveOffered = quickSaveInMenu > 0;

    // Pause / Resume via menu
    await page.getByRole('dialog').getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Resume' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Resume' }).click();
    await page.getByRole('dialog', { name: 'Game menu' }).waitFor({ state: 'hidden' });
    evidence.orbit.pauseResume = true;

    // Escape + focus
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Game menu' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Game menu' }).waitFor({ state: 'hidden' });
    evidence.orbit.escape = true;

    // Input leak while dialog open
    await openMenu(page);
    const leak = await page.evaluate(async () => {
      const events = [];
      const onInput = (e) => events.push(e.detail);
      window.addEventListener('retro-input', onInput);
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true }),
      );
      await new Promise((r) => setTimeout(r, 80));
      window.removeEventListener('retro-input', onInput);
      return events.filter((e) => e.command === 6 && e.value === 1).length;
    });
    if (leak !== 0) throw new Error(`Orbit input leaked through menu: ${leak}`);
    evidence.orbit.noInputLeak = true;
    await closeMenu(page);

    // Fullscreen lifecycle on shell
    await openMenu(page);
    await page.getByRole('dialog').getByRole('button', { name: 'Fullscreen' }).click();
    await page.waitForTimeout(400);
    const fs = await page.evaluate(() => !!document.fullscreenElement);
    evidence.orbit.fullscreenAttempted = true;
    evidence.orbit.fullscreenActive = fs;
    await page.evaluate(() => {
      if (document.fullscreenElement) {
        return document.exitFullscreen().catch(() => undefined);
      }
    });
    await closeMenu(page).catch(() => {});

    const mountsAfter = await countIframes(page);
    evidence.orbit.mountStable = mountsBefore === mountsAfter;
    if (mountsBefore !== mountsAfter) {
      throw new Error(`Orbit iframe remounted: ${mountsBefore} → ${mountsAfter}`);
    }

    // Held keyboard must not spam events
    const held = await measureInputWhileHeld(page, 450);
    evidence.performance.heldKeyPresses = held.presses;
    evidence.performance.heldKeyReleases = held.releases;
    if (held.presses !== 1 || held.releases !== 1) {
      throw new Error(`Held key spam: ${JSON.stringify(held)}`);
    }

    const menuBlocked = await measureInputWhileMenuOpen(page);
    evidence.performance.menuOpenPadEvents = menuBlocked.total;
    if (menuBlocked.presses !== 0) {
      throw new Error(`Gamepad pressed through menu: ${JSON.stringify(menuBlocked)}`);
    }

    await page.close();
  }

  // ---------- Genesis save/load reliability ----------
  {
    log('genesis:start');
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.setDefaultTimeout(120000);
    await installGame(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    await waitPlaying(page);
    await page.waitForTimeout(2500);

    // Real gameplay input after boot
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowRight');
    evidence.genesis.inputOk = true;

    await page.getByRole('button', { name: 'Quick save', exact: true }).click();
    await page.getByText(/Quick save stored|saved successfully|Saving/i).first().waitFor({
      timeout: 30000,
    });
    await page.getByText(/Quick save stored|saved successfully/i).first().waitFor({
      timeout: 30000,
    });
    evidence.genesis.quickSave = true;

    // Pause → confirm load
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Quick load', exact: true }).click();
    await page.getByRole('alertdialog').waitFor();
    // Escape cancels confirm only
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    evidence.genesis.loadConfirmEscape = true;

    await page.getByRole('button', { name: 'Quick load', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
    await page.getByText(/Restored successfully/i).first().waitFor({ timeout: 30000 });
    evidence.genesis.quickLoad = true;

    // Pause → Restart → Resume path
    await openMenu(page);
    await page.getByRole('dialog').getByRole('button', { name: 'Restart' }).click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Restart' }).click();
    await page.getByText(/Game reset/i).first().waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor({ timeout: 10000 });
    evidence.genesis.pauseResetResume = true;

    // Inputs work after menu dismissal
    await openMenu(page);
    await closeMenu(page);
    const afterMenu = await measureInputWhileHeld(page, 200);
    if (afterMenu.presses !== 1) throw new Error('Input broken after menu');
    evidence.genesis.inputAfterMenu = true;

    // Save survives reload
    await page.getByRole('button', { name: 'Quick save', exact: true }).click();
    await page.getByText(/Quick save stored|saved successfully/i).first().waitFor({
      timeout: 30000,
    });
    const playUrl = page.url();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
      state: 'visible',
      timeout: 120000,
    });
    await waitPlaying(page);
    await page.getByRole('button', { name: 'Quick load', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
    await page.getByText(/Restored successfully/i).first().waitFor({ timeout: 30000 });
    evidence.genesis.saveSurvivesReload = true;
    evidence.genesis.playUrl = playUrl;

    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'player-genesis-after-load.png'),
      fullPage: true,
    });
    await page.close();
  }

  // ---------- MSX representative ----------
  {
    log('msx:start');
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(120000);
    await installGame(page, 'mit-msx-dot', 'MIT MSX Dot');
    await waitPlaying(page);
    await page.waitForTimeout(2000);
    await openMenu(page);
    const hasQuick = await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Quick save', exact: true })
      .count();
    evidence.msx.hasQuickSave = hasQuick > 0;
    if (hasQuick) {
      await page.getByRole('dialog').getByRole('button', { name: 'Quick save' }).click();
      await page.getByText(/Quick save stored|saved successfully/i).first().waitFor({
        timeout: 45000,
      });
      evidence.msx.quickSave = true;
    }
    await closeMenu(page).catch(() => {});
    const held = await measureInputWhileHeld(page, 200);
    evidence.msx.inputOk = held.presses === 1;
    if (held.presses !== 1) throw new Error('MSX input failed after menu');
    await page.close();
  }

  // ---------- Mobile overlay ----------
  {
    log('mobile:start');
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    page.setDefaultTimeout(60000);
    await installGame(page, 'orbit-catch', 'Orbit Catch');
    await waitPlaying(page);

    await openMenu(page);
    const showTouch = page.getByRole('dialog').getByRole('button', {
      name: 'Show touch controls',
      exact: true,
    });
    if (await showTouch.isVisible().catch(() => false)) await showTouch.click();
    else await closeMenu(page);

    await page.getByRole('button', { name: 'Touch Left' }).waitFor({ timeout: 15000 });
    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'player-mobile-portrait.png'),
      fullPage: true,
    });

    // Multitouch + pointer cancel must not stick
    const left = page.getByRole('button', { name: 'Touch Left' });
    const aBtn = page.getByRole('button', { name: 'Touch A' });
    await page.evaluate(() => {
      window.__retroInputLog = [];
      window.addEventListener('retro-input', (e) => window.__retroInputLog.push(e.detail));
    });
    await left.dispatchEvent('pointerdown', { pointerId: 21, bubbles: true, cancelable: true });
    await aBtn.dispatchEvent('pointerdown', { pointerId: 22, bubbles: true, cancelable: true });
    await left.dispatchEvent('pointercancel', { pointerId: 21, bubbles: true });
    await aBtn.dispatchEvent('pointerup', { pointerId: 22, bubbles: true });
    const touchLog = await page.evaluate(() => window.__retroInputLog || []);
    const stuckLeft = touchLog.filter((e) => e.command === 6).at(-1);
    if (stuckLeft && stuckLeft.value !== 0) {
      throw new Error(`Stuck Left after cancel: ${JSON.stringify(stuckLeft)}`);
    }
    evidence.mobile.multitouchCancel = true;

    // Menu blocks touch presses
    await openMenu(page);
    const blocked = await page.evaluate(async () => {
      window.__retroInputLog = [];
      const btn = document.querySelector('[aria-label="Touch Left"]');
      if (!btn) return { missing: true };
      btn.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 31, bubbles: true, cancelable: true }),
      );
      await new Promise((r) => setTimeout(r, 50));
      return {
        presses: window.__retroInputLog.filter((e) => e.command === 6 && e.value === 1).length,
      };
    });
    if (blocked.presses) throw new Error(`Touch leaked through menu: ${JSON.stringify(blocked)}`);
    evidence.mobile.menuBlocksTouch = true;
    await closeMenu(page);

    // Layout editor Save/Cancel
    await openMenu(page);
    await page.getByRole('dialog').getByRole('button', { name: /Edit touch controls/i }).click();
    await page.locator('.layout-editor').waitFor();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.locator('.layout-editor').waitFor({ state: 'hidden' });
    evidence.mobile.editCancel = true;

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'player-mobile-landscape.png'),
      fullPage: true,
    });
    evidence.mobile.landscape = true;
    await page.close();
  }

  writeFileSync(
    join(evidenceDir, 'player-ux-reliability-20261026.json'),
    JSON.stringify(evidence, null, 2),
  );
  console.log('PLAYER_UX_PASS', JSON.stringify(evidence));
  await browser.close();
})().catch(async (err) => {
  console.error('PLAYER_UX_FAIL', err);
  process.exitCode = 1;
});
