/**
 * Catalog-installed Genesis/PS1/PSP: download via launcher, then fresh-process
 * offline cold-start with save/load. Complements core-smoke gameplay proofs.
 */
const { chromium } = require('@playwright/test');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05');

const GAMES = [
  { slug: 'mit-genesis-breakout', title: 'MIT Genesis Breakout', platform: 'genesis' },
  { slug: 'mit-ps1-dot', title: 'MIT PS1 Dot', platform: 'ps1' },
  { slug: 'mit-psp-dot', title: 'MIT PSP Dot', platform: 'psp' },
];

async function installGame(page, game) {
  await page.goto(`${baseUrl}/games/${game.slug}`);
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Download & try on this device' }).click();
  await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 300000 });
  await page.getByRole('link', { name: '▶ Play game' }).click();
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
  await page.getByRole('button', { name: 'Save state', exact: true }).click();
  await page.getByText('State saved on this device', { exact: true }).waitFor({ timeout: 30000 });
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  });
  if (!controlled) throw new Error(`${game.slug}: service worker not controlling after install`);
}

async function offlineColdBoot(page, game) {
  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 60000 });
  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: game.title }) })
    .getByRole('link', { name: 'Play game' })
    .click();
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
  await page.getByRole('button', { name: 'Load state', exact: true }).click();
  await page.getByText('State restored', { exact: true }).waitFor({ timeout: 30000 });
}

async function run() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-console-offline-'));
  const results = {};
  try {
    let context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    let page = context.pages()[0] || (await context.newPage());
    page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`);
    });

    for (const game of GAMES) {
      console.log(`CATALOG_INSTALL_START ${game.platform}`);
      await installGame(page, game);
      console.log(`CATALOG_INSTALL_PASS ${game.platform}`);
      results[`${game.platform}Install`] = true;
    }
    await context.close();

    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    page = context.pages()[0] || (await context.newPage());
    page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
    await context.setOffline(true);

    for (const game of GAMES) {
      console.log(`CATALOG_OFFLINE_START ${game.platform}`);
      await offlineColdBoot(page, game);
      console.log(`CATALOG_OFFLINE_PASS ${game.platform}`);
      results[`${game.platform}Offline`] = true;
      await page.screenshot({
        path: join(evidenceDir, 'screenshots', `catalog-offline-${game.platform}.png`),
        fullPage: true,
      });
    }

    await context.close();
    mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });
    writeFileSync(join(evidenceDir, 'catalog-console-offline-20261020.txt'), JSON.stringify(results, null, 2));
    console.log(`CATALOG_CONSOLE_OFFLINE_PASS ${JSON.stringify(results)}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
