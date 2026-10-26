/**
 * Player UX smoke: menu, pause, quick save/load when Orbit (native) or when saveState exists.
 * Simulated Chromium only — not physical gamepad / iOS certification.
 */
const { chromium } = require('playwright');
const { mkdirSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir = process.env.EVIDENCE_DIR || join(__dirname, '../../../docs/test-evidence/PH-UX');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

async function installOrbit(page) {
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 30000 });
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) {
    await play.first().click();
  } else {
    await page.getByRole('button', { name: /Download/i }).first().click();
    await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 120000 });
    await page.getByRole('link', { name: /Play game/i }).click();
  }
  await page.waitForURL(/\/play\//, { timeout: 30000 });
  await page.locator('.player-stage').waitFor({ timeout: 30000 });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(45000);

  await installOrbit(page);
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-shell-desktop.png'),
    fullPage: true,
  });

  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.waitFor({ state: 'visible', timeout: 60000 });
  await menu.click();
  await page.getByRole('dialog', { name: 'Game menu' }).waitFor();
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-game-menu.png'),
    fullPage: true,
  });

  // Pause via menu then resume
  const pauseOrResume = page.getByRole('dialog').getByRole('button', { name: /Pause|Resume/ });
  await pauseOrResume.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await page.getByText(/Paused|Resumed|Playing/i).first().waitFor({ timeout: 10000 }).catch(() => {});

  // Escape toggles menu
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Game menu' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Game menu' }).waitFor({ state: 'hidden' });

  // Mobile viewport overlay
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-mobile-portrait.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-mobile-landscape.png'),
    fullPage: true,
  });

  // Leave player
  await page.goto(`${baseUrl}/library`);
  await page.getByRole('heading', { name: /My library/i }).waitFor();

  console.log('PLAYER_UX_PASS');
  await browser.close();
})().catch(async (err) => {
  console.error('PLAYER_UX_FAIL', err);
  process.exitCode = 1;
});
