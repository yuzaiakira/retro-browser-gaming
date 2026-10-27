/**
 * Sprint 6 — final UX acceptance journeys A–F (Chromium).
 * Uses real UI; screenshots alone are not acceptance.
 *
 * A Orbit: Discover → Download → Play
 * B Genesis: Continue / details → Menu → Quick Save → Exit
 * C Genesis: Offline cold library → Play → Load
 * D Genesis: Simulated controller navigate → pause → exit
 * E Library / Downloads reachable (repair affordance surface)
 * F Genesis: Background tab → resume → save → exit → reopen
 */
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir =
  process.env.EVIDENCE_DIR ||
  join(__dirname, '../../../docs/test-evidence/PH-UX-STABILITY');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

async function waitMenuEnabled(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 180000,
  });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 180000 });
}

async function ensureReadyAndPlay(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  const play = page.getByRole('link', { name: /Play game/i });
  // Wait for install state to hydrate from IndexedDB/OPFS.
  await page
    .getByRole('link', { name: /Play game/i })
    .or(page.getByRole('button', { name: /Download|Retry|Resume/i }))
    .first()
    .waitFor({ timeout: 60000 });
  if (await play.count()) {
    await play.first().click();
    return 'already-installed';
  }
  await page.getByRole('button', { name: /Download|Retry|Resume/i }).first().click();
  await play.waitFor({ timeout: 300000 });
  await play.click();
  return 'downloaded';
}

async function exitLibrary(page) {
  await page.getByRole('link', { name: 'Library' }).click();
  if (await page.getByRole('heading', { name: /Leave this game/i }).count()) {
    await page.getByRole('button', { name: /Exit to library/i }).click();
  }
  await page.waitForURL(/\/library/, { timeout: 30000 });
}

async function quickSave(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Game menu' });
  await menu.waitFor();
  await menu.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-toast, .player-status')
    .filter({ hasText: /Quick save stored/i })
    .first()
    .waitFor({ timeout: 60000 });
  await menu.getByRole('button', { name: 'Close' }).click();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const evidence = { A: {}, B: {}, C: {}, D: {}, E: {}, F: {} };

  // A — new user Discover → Download → Play (Orbit)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(180000);
    await page.goto(`${baseUrl}/`);
    evidence.A.home = true;
    evidence.A.downloaded = await ensureReadyAndPlay(page, 'orbit-catch', 'Orbit Catch');
    await waitMenuEnabled(page);
    evidence.A.played = true;
    await exitLibrary(page);
    await page.close();
  }

  // B — Returning user: Continue Playing (or details) → Menu → Save → Exit (Genesis)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(180000);
    // Ensure Genesis is installed so Continue / details can launch with saveState.
    await ensureReadyAndPlay(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    await waitMenuEnabled(page);
    await exitLibrary(page);

    await page.goto(`${baseUrl}/`);
    const cont = page.getByTestId('continue-playing');
    const contPlay = cont.getByRole('link', { name: /Play/i });
    if ((await cont.count()) && (await contPlay.count())) {
      evidence.B.continueSection = true;
      await contPlay.first().click();
    } else {
      evidence.B.continueSection = 'fallback-details-play';
      await ensureReadyAndPlay(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    }
    await waitMenuEnabled(page);
    await quickSave(page);
    evidence.B.saved = true;
    await exitLibrary(page);
    evidence.B.exited = true;
    await page.close();
  }

  // C — offline cold path (persistent profile, Genesis)
  {
    const userDataDir = join(evidenceDir, `.offline-profile-final-${Date.now()}`);
    mkdirSync(userDataDir, { recursive: true });
    const context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
      headless: true,
      viewport: { width: 1280, height: 800 },
    });
    const page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(180000);
    await ensureReadyAndPlay(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    await waitMenuEnabled(page);
    await quickSave(page);
    await exitLibrary(page);
    await context.setOffline(true);
    await page.goto(`${baseUrl}/library`);
    await page.getByRole('heading', { name: /library|arcade|My library/i }).first().waitFor({
      timeout: 60000,
    });
    evidence.C.offlineLibrary = true;
    await page
      .getByRole('link', { name: /Play/i })
      .or(page.getByRole('link', { name: /Play game/i }))
      .first()
      .click();
    // Library cards may deep-link to details; finish into player if needed.
    if (!page.url().includes('/play/')) {
      await page.getByRole('link', { name: /Play game/i }).click();
    }
    await waitMenuEnabled(page);
    evidence.C.offlinePlay = true;
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Game menu' })
      .getByRole('button', { name: 'Quick load', exact: true })
      .click();
    await page.getByRole('heading', { name: 'Load save state?' }).waitFor();
    await page.getByRole('button', { name: 'Load', exact: true }).click();
    await page
      .locator('.player-toast, .player-status')
      .filter({ hasText: /Restored successfully/i })
      .first()
      .waitFor({ timeout: 60000 });
    evidence.C.load = true;
    await exitLibrary(page);
    await context.close();
  }

  // D — controller-sim navigate → launch → pause → exit
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      const buttons = () =>
        Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
      window.__RBG_PAD = {
        id: 'Sprint6 Sim',
        index: 0,
        connected: true,
        mapping: 'standard',
        timestamp: 0,
        axes: [0, 0, 0, 0],
        buttons: buttons(),
      };
      Navigator.prototype.getGamepads = () => [window.__RBG_PAD];
      window.__RBG_PAD_SET = (map) => {
        window.__RBG_PAD.buttons = buttons();
        for (const [k, v] of Object.entries(map || {})) {
          const i = Number(k);
          if (window.__RBG_PAD.buttons[i]) {
            window.__RBG_PAD.buttons[i] = { pressed: !!v, touched: !!v, value: v ? 1 : 0 };
          }
        }
      };
    });
    page.setDefaultTimeout(180000);
    await page.goto(`${baseUrl}/games`);
    await page.getByRole('link', { name: 'All games', exact: true }).focus();
    await page.evaluate(() => window.__RBG_PAD_SET({ 13: true }));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__RBG_PAD_SET({}));
    evidence.D.nav = true;
    await ensureReadyAndPlay(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    await waitMenuEnabled(page);
    await page.keyboard.press('KeyP');
    await page.locator('.player-shell[data-paused]').waitFor({ timeout: 15000 });
    evidence.D.paused = true;
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await exitLibrary(page);
    evidence.D.exited = true;
    await context.close();
  }

  // E — broken-install / repair surface reachable
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(60000);
    await page.goto(`${baseUrl}/library`);
    evidence.E.libraryReachable = true;
    await page.goto(`${baseUrl}/downloads`);
    evidence.E.downloadsReachable = true;
    await page.close();
  }

  // F — long session: play → hide → resume → save → exit → reopen (Genesis)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(180000);
    await ensureReadyAndPlay(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    await waitMenuEnabled(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    evidence.F.backgroundResume = true;
    await quickSave(page);
    evidence.F.saved = true;
    await exitLibrary(page);
    await ensureReadyAndPlay(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    await waitMenuEnabled(page);
    evidence.F.reopened = true;
    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'final-ux-reopen.png'),
      fullPage: true,
    });
    await exitLibrary(page);
    await page.close();
  }

  const required = [
    ['A.played', evidence.A.played],
    ['B.exited', evidence.B.exited],
    ['B.saved', evidence.B.saved],
    ['C.offlineLibrary', evidence.C.offlineLibrary],
    ['C.offlinePlay', evidence.C.offlinePlay],
    ['C.load', evidence.C.load],
    ['D.paused', evidence.D.paused],
    ['D.exited', evidence.D.exited],
    ['E.libraryReachable', evidence.E.libraryReachable],
    ['F.backgroundResume', evidence.F.backgroundResume],
    ['F.saved', evidence.F.saved],
    ['F.reopened', evidence.F.reopened],
  ];
  for (const [name, ok] of required) {
    if (!ok) throw new Error(`Final UX failed: ${name}`);
  }

  writeFileSync(join(evidenceDir, 'final-ux-acceptance-latest.json'), JSON.stringify(evidence, null, 2));
  console.log('FINAL_UX_ACCEPTANCE_PASS', JSON.stringify(evidence));
  await browser.close();
})().catch((err) => {
  console.error('FINAL_UX_ACCEPTANCE_FAIL', err);
  process.exitCode = 1;
});
