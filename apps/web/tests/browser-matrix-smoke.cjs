/**
 * Automated multi-browser catalog/install smoke.
 * Distinguishes Playwright Firefox/WebKit from physical device evidence.
 */
const { chromium, firefox, webkit } = require('@playwright/test');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-02');

async function catalogSmoke(browserType, name, launchOptions = {}) {
  const browser = await browserType.launch({ headless: true, ...launchOptions });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 60000 });
    await page.getByRole('heading', { name: 'MIT Genesis Breakout' }).waitFor({ timeout: 30000 });
    await page.screenshot({ path: join(evidenceDir, 'screenshots', `${name}-catalog.png`), fullPage: true });
    return { ok: true };
  } finally {
    await browser.close();
  }
}

async function firefoxInstallSmoke() {
  const browser = await firefox.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => console.error(`FIREFOX_PAGEERROR ${error.message}`));
    await page.goto(`${baseUrl}/games/orbit-catch`);
    await page.getByRole('button', { name: 'Download & try on this device' }).click();
    await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 120000 });
    await page.getByRole('link', { name: '▶ Play game' }).click();
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: 'Save state', exact: true }).click();
    await page.getByText('State saved on this device', { exact: true }).waitFor();
    await context.setOffline(true);
    await page.goto(`${baseUrl}/library`);
    await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 30000 });
    await page.screenshot({ path: join(evidenceDir, 'screenshots', 'firefox-offline-library.png'), fullPage: true });
    return { ok: true, offlineLibrary: true };
  } finally {
    await browser.close();
  }
}

async function run() {
  mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });
  const results = {
    physicalHardware: 'NOT_VERIFIED — no connected gamepad/mobile/iOS Safari in this session',
    playwrightWebKitNote: 'Playwright WebKit is not proof of real iOS Safari compatibility',
  };

  try {
    await catalogSmoke(chromium, 'chromium-matrix', {
      executablePath: process.env.CHROMIUM_EXECUTABLE,
      args: ['--no-sandbox'],
    });
    results.chromiumCatalog = true;
    console.log('MATRIX_CHROMIUM_CATALOG_PASS');
  } catch (error) {
    results.chromiumCatalog = String(error);
    console.error('MATRIX_CHROMIUM_CATALOG_FAIL', error);
  }

  try {
    await catalogSmoke(firefox, 'firefox-matrix');
    results.firefoxCatalog = true;
    console.log('MATRIX_FIREFOX_CATALOG_PASS');
  } catch (error) {
    results.firefoxCatalog = String(error);
    console.error('MATRIX_FIREFOX_CATALOG_FAIL', error);
  }

  try {
    results.firefoxInstallOffline = await firefoxInstallSmoke();
    console.log('MATRIX_FIREFOX_INSTALL_OFFLINE_PASS');
  } catch (error) {
    results.firefoxInstallOffline = String(error);
    console.error('MATRIX_FIREFOX_INSTALL_OFFLINE_FAIL', error);
  }

  try {
    await catalogSmoke(webkit, 'webkit-matrix');
    results.webkitCatalog = true;
    console.log('MATRIX_WEBKIT_CATALOG_PASS');
  } catch (error) {
    results.webkitCatalog = `NOT_VERIFIED: ${error}`;
    console.error('MATRIX_WEBKIT_CATALOG_FAIL', error);
  }

  writeFileSync(join(evidenceDir, 'browser-matrix-20261020.txt'), JSON.stringify(results, null, 2));
  console.log(`BROWSER_MATRIX_DONE ${JSON.stringify(results)}`);
  if (!results.chromiumCatalog || results.chromiumCatalog !== true) process.exitCode = 1;
  if (!results.firefoxCatalog || results.firefoxCatalog !== true) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
