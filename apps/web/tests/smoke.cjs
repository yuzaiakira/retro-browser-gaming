const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;

async function run() {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`); });
  await page.goto(`${baseUrl}/`);
  await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor();
  const evidenceDir = resolveEvidenceDir('PH-02');
  await page.screenshot({ path: require('path').join(evidenceDir, 'screenshots', 'catalog.png'), fullPage: true });
  const mobile = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseUrl}/`);
  await mobilePage.getByRole('heading', { name: 'Orbit Catch' }).waitFor();
  if (!await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)) throw new Error('Mobile layout has horizontal overflow');
  await mobilePage.keyboard.press('Tab');
  if (!await mobilePage.evaluate(() => document.activeElement instanceof HTMLAnchorElement || document.activeElement instanceof HTMLButtonElement)) throw new Error('Keyboard focus did not reach an interactive control');
  await mobilePage.screenshot({ path: require('path').join(evidenceDir, 'screenshots', 'catalog-mobile.png'), fullPage: true });
  await mobile.close();
  console.log('RESPONSIVE_KEYBOARD_PASS');
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('button', { name: 'Download & try on this device' }).click();
  await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 45000 });
  console.log('INSTALLED');
  await page.getByRole('link', { name: '▶ Play game' }).click();
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: require('path').join(evidenceDir, 'screenshots', 'native-game.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save state', exact: true }).click();
  await page.getByText('State saved on this device', { exact: true }).waitFor();
  console.log('NATIVE_SAVE_PASS');
  await context.setOffline(true);
  await page.goto(`${baseUrl}/library`);
  await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 20000 });
  console.log('OFFLINE_LIBRARY_PASS');
  await page.getByRole('link', { name: 'Play game' }).click();
  for (let reload = 1; reload <= 3; reload += 1) {
    await page.reload();
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 20000 });
    console.log(`OFFLINE_RELOAD_PASS ${reload}`);
  }
  await page.getByRole('button', { name: 'Load state', exact: true }).click();
  await page.getByText('State restored', { exact: true }).waitFor();
  console.log('OFFLINE_LOAD_PASS');
  await browser.close();
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
