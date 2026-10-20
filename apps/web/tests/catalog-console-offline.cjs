/**
 * Catalog-installed Genesis/SMS/GG/NES/SNES/GB/GBC/GBA/PS1/PSP: download via launcher,
 * then fresh-process offline cold-start with save/load.
 */
const { chromium } = require('@playwright/test');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-05');
const only = (process.env.CATALOG_OFFLINE_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const GAMES = [
  { slug: 'mit-genesis-breakout', title: 'MIT Genesis Breakout', platform: 'genesis' },
  { slug: 'mit-sms-ninjagirl', title: 'MIT SMS Ninja Girl', platform: 'sms' },
  { slug: 'mit-gg-waternet', title: 'MIT GG Waternet', platform: 'gg' },
  { slug: 'mit-nes-table-tennis', title: 'MIT NES Table Tennis', platform: 'nes' },
  { slug: 'mit-snes-gothicvania', title: 'MIT SNES Gothicvania', platform: 'snes' },
  { slug: 'mit-gb-dot', title: 'MIT GB Dot', platform: 'gb' },
  { slug: 'mit-gbc-waternet', title: 'MIT GBC Waternet', platform: 'gbc' },
  { slug: 'mit-gba-dino', title: 'MIT GBA Dino', platform: 'gba' },
  { slug: 'mit-a2600-berta', title: 'MIT Atari 2600 Berta', platform: 'a2600' },
  { slug: 'huc-pce-scroll', title: 'HuC PCE Scroll', platform: 'pce' },
  { slug: 'mit-ps1-dot', title: 'MIT PS1 Dot', platform: 'ps1' },
  { slug: 'mit-psp-dot', title: 'MIT PSP Dot', platform: 'psp' },
].filter((g) => !only.length || only.includes(g.platform));

async function installGame(page, game) {
  await page.goto(`${baseUrl}/games/${game.slug}`);
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 30000 });
  const play = page.getByRole('link', { name: '▶ Play game' });
  if (await play.count()) {
    await play.click();
  } else {
    await page.getByRole('button', { name: 'Download & try on this device' }).click();
    await play.waitFor({ timeout: 300000 });
    await play.click();
  }
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });

  // Keyboard input while catalog player is live (libretro Left)
  await page.evaluate(() => {
    window.__retroInputLog = [];
    window.addEventListener('retro-input', (e) => window.__retroInputLog.push(e.detail));
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true }),
    );
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keyup', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true }),
    );
  });
  const keyHit = await page.evaluate(
    () => (window.__retroInputLog || []).some((e) => e.command === 6 && e.value === 1),
  );
  if (!keyHit) throw new Error(`${game.slug}: keyboard Left did not reach InputRouter`);

  // Touch overlay when present
  const touchToggle = page.getByRole('button', { name: /touch controls/i });
  if (await touchToggle.count()) {
    const label = await touchToggle.textContent();
    if (label?.includes('Show')) await touchToggle.click();
  }
  const touchLeft = page.getByRole('button', { name: 'Touch Left' });
  if (await touchLeft.count()) {
    await page.evaluate(() => {
      window.__retroInputLog = [];
    });
    await touchLeft.dispatchEvent('pointerdown', { pointerId: 41, bubbles: true });
    await page.waitForTimeout(50);
    await touchLeft.dispatchEvent('pointerup', { pointerId: 41, bubbles: true });
    const touchHit = await page.evaluate(
      () => (window.__retroInputLog || []).some((e) => e.command === 6 && e.value === 1),
    );
    if (!touchHit) throw new Error(`${game.slug}: Touch Left did not reach InputRouter`);
  }

  await page.getByRole('button', { name: 'Save state', exact: true }).click();
  await page.getByText('State saved on this device', { exact: true }).waitFor({ timeout: 30000 });
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  });
  if (!controlled) throw new Error(`${game.slug}: service worker not controlling after install`);

  // Lifecycle: leave player (dispose path) before offline cold-start reopen
  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 60000 });
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
