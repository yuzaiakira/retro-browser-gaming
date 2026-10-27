/**
 * Sprint 4 — personalization E2E (display, prefs persistence, save manager, HUD).
 * Uses real Orbit + Genesis where available. Simulated Chromium only.
 */
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir =
  process.env.EVIDENCE_DIR ||
  join(__dirname, '../../../docs/test-evidence/PH-UX-PERSONALIZE');
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

async function ensureInstalled(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  if (await page.getByRole('link', { name: /Play game/i }).count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 300000 });
}

async function openMenu(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('heading', { name: 'Game menu' }).waitFor();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const evidence = { display: {}, prefs: {}, saves: {}, hud: {}, shortcuts: {} };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);

  await ensureInstalled(page, 'orbit-catch', 'Orbit Catch');
  await page.getByRole('link', { name: /Play game/i }).click();
  await page.waitForURL(/\/play\//);
  await waitMenuEnabled(page);

  const epochBefore = await page.locator('.player-shell').getAttribute('data-iframe-epoch');
  const iframeBefore = await page.locator('.player-stage iframe').count();

  await openMenu(page);
  await page.getByLabel('Display mode').selectOption('original');
  await page.waitForTimeout(200);
  const stage = page.locator('.player-stage');
  evidence.display.modeOriginal = (await stage.getAttribute('data-display')) === 'original';
  await page.getByLabel('Frame scaling filter').selectOption('sharp');
  evidence.display.filterSharp = (await stage.getAttribute('data-filter')) === 'sharp';

  const epochAfter = await page.locator('.player-shell').getAttribute('data-iframe-epoch');
  const iframeAfter = await page.locator('.player-stage iframe').count();
  evidence.display.noRemount =
    epochBefore === epochAfter && iframeBefore === iframeAfter && iframeAfter === 1;

  await page.getByRole('button', { name: 'Integer scaling', exact: false }).count().catch(() => 0);
  const integerDisabled = await page.locator('select[aria-label="Display mode"] option:disabled').count();
  evidence.display.integerHonest = integerDisabled >= 1;

  await page.getByRole('button', { name: 'Minimize HUD' }).click();
  await page.locator('.player-shell[data-hud="minimal"]').waitFor();
  await page.getByRole('heading', { name: 'Game menu' }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Open game menu' }).waitFor();
  evidence.hud.minimal = true;
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-hud-minimal.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Open game menu' }).click();
  await page.getByRole('heading', { name: 'Game menu' }).waitFor();
  await page.getByRole('button', { name: 'Show full HUD' }).click();
  await page.locator('.player-shell[data-hud="full"]').waitFor();
  evidence.hud.restored = true;

  // Shortcut: Escape opens/closes menu without typing into inputs
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Game menu' }).waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Game menu' }).waitFor();
  evidence.shortcuts.escapeMenu = true;
  await page.getByRole('button', { name: 'Close' }).click();

  // Persist prefs across reopen
  await page.goto(`${baseUrl}/library`);
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('link', { name: /Play game/i }).click();
  await waitMenuEnabled(page);
  await openMenu(page);
  const mode = await page.getByLabel('Display mode').inputValue();
  evidence.prefs.persistedOriginal = mode === 'original';
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-display-original.png'),
    fullPage: true,
  });

  // Genesis save manager (saveState runtime)
  await page.goto(`${baseUrl}/games/mit-genesis-breakout`);
  await ensureInstalled(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
  await page.getByRole('link', { name: /Play game/i }).click();
  await waitMenuEnabled(page);
  await openMenu(page);
  const menu = page.getByRole('dialog', { name: 'Game menu' });
  await menu.getByRole('heading', { name: 'Save manager' }).waitFor();
  await menu.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-toast, .player-status')
    .filter({ hasText: /Quick save stored/i })
    .first()
    .waitFor({ timeout: 60000 });
  await menu
    .getByRole('list', { name: 'Save slots' })
    .locator('li[data-status="saved"]')
    .filter({ hasText: /Quick save/i })
    .waitFor({ timeout: 15000 });
  evidence.saves.slotList = true;
  const emptyLoad = page
    .getByRole('list', { name: 'Save slots' })
    .locator('li[data-status="empty"] button', { hasText: 'Load' })
    .first();
  if (await emptyLoad.count()) {
    evidence.saves.emptyLoadDisabled = await emptyLoad.isDisabled();
  } else {
    evidence.saves.emptyLoadDisabled = true;
  }
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-save-manager.png'),
    fullPage: true,
  });

  // Settings everyday play defaults
  await page.goto(`${baseUrl}/settings`);
  await page.getByRole('heading', { name: 'Play defaults' }).waitFor();
  await page.getByText(/Advanced/i).first().waitFor();
  evidence.prefs.settingsEveryday = true;

  const required = [
    ['noRemount', evidence.display.noRemount],
    ['integerHonest', evidence.display.integerHonest],
    ['persistedOriginal', evidence.prefs.persistedOriginal],
    ['minimalHud', evidence.hud.minimal],
    ['escapeMenu', evidence.shortcuts.escapeMenu],
    ['slotList', evidence.saves.slotList],
    ['settingsEveryday', evidence.prefs.settingsEveryday],
  ];
  for (const [name, ok] of required) {
    if (!ok) throw new Error(`Required personalization assertion failed: ${name}`);
  }

  writeFileSync(join(evidenceDir, 'player-personalization-20261027.json'), JSON.stringify(evidence, null, 2));
  console.log('PLAYER_PERSONALIZATION_PASS', JSON.stringify(evidence));
  await browser.close();
})().catch((err) => {
  console.error('PLAYER_PERSONALIZATION_FAIL', err);
  process.exitCode = 1;
});
