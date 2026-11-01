/**
 * PH-02 catalog + native Orbit Catch offline journey.
 *
 * Root-cause (2026-11-01 triage):
 * - Home Discover is a paginated Explore list (24/page, alpha by title). With
 *   47+ engineering fixtures, "Orbit Catch" is not on page 1 — never assert it
 *   as a home heading.
 * - PlayerShell labels are Menu / Quick save / Quick load (not legacy
 *   "Save state" / "State saved on this device").
 *
 * Classification: test staleness after Hub UX + catalog growth — not a catalog
 * API regression. Evidence: `.runtime/test-evidence/PH-12/orbit-smoke-triage/`.
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { join } = require('node:path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

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

async function quickSave(page) {
  await page.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Quick save stored|saved/i })
    .waitFor({ timeout: 60000 });
}

async function quickLoad(page) {
  await page.getByRole('button', { name: 'Quick load', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Restored successfully/i })
    .waitFor({ timeout: 60000 });
}

async function run() {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
  });

  await page.goto(`${baseUrl}/`);
  await page.getByRole('heading', { name: /Explore games/i }).waitFor({ timeout: 60000 });
  const evidenceDir = resolveEvidenceDir('PH-02');
  await page.screenshot({ path: join(evidenceDir, 'screenshots', 'catalog.png'), fullPage: true });

  const mobile = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  mobilePage.setDefaultTimeout(60000);
  await mobilePage.goto(`${baseUrl}/`);
  await mobilePage.getByRole('heading', { name: /Explore games/i }).waitFor({ timeout: 60000 });
  if (!(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))) {
    throw new Error('Mobile layout has horizontal overflow');
  }
  await mobilePage.keyboard.press('Tab');
  if (
    !(await mobilePage.evaluate(
      () =>
        document.activeElement instanceof HTMLAnchorElement ||
        document.activeElement instanceof HTMLButtonElement,
    ))
  ) {
    throw new Error('Keyboard focus did not reach an interactive control');
  }
  await mobilePage.screenshot({
    path: join(evidenceDir, 'screenshots', 'catalog-mobile.png'),
    fullPage: true,
  });
  await mobile.close();
  console.log('RESPONSIVE_KEYBOARD_PASS');

  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('heading', { name: 'Orbit Catch', exact: true }).waitFor({ timeout: 60000 });
  console.log('ORBIT_DETAIL_PASS');

  const play = page.getByRole('link', { name: /Play game/i });
  if (!(await play.count())) {
    await page.getByRole('button', { name: /Download/i }).first().click();
    await play.waitFor({ timeout: 180000 });
  }
  console.log('INSTALLED');
  await play.click();
  await page.waitForURL(/\/play\//, { timeout: 60000 });
  await waitMenuEnabled(page);
  await page.screenshot({ path: join(evidenceDir, 'screenshots', 'native-game.png'), fullPage: true });

  await quickSave(page);
  console.log('NATIVE_SAVE_PASS');

  await context.setOffline(true);
  await page.goto(`${baseUrl}/library`);
  await page.getByRole('heading', { name: /My library/i }).waitFor({ timeout: 30000 });
  await page.locator('article.game-card', { hasText: 'Orbit Catch' }).first().waitFor({ timeout: 30000 });
  console.log('OFFLINE_LIBRARY_PASS');
  await page
    .locator('article.game-card', { hasText: 'Orbit Catch' })
    .getByRole('link', { name: /^▶ Play$/ })
    .first()
    .click();
  await waitMenuEnabled(page);
  for (let reload = 1; reload <= 3; reload += 1) {
    await page.reload();
    await waitMenuEnabled(page);
    console.log(`OFFLINE_RELOAD_PASS ${reload}`);
  }
  await quickLoad(page);
  console.log('OFFLINE_LOAD_PASS');
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
