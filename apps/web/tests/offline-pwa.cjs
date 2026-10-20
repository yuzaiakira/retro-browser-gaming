/**
 * Offline PWA acceptance: persistent-profile cold start, core eviction (OFF-004),
 * and waiting SW update without disrupting an active session (OFF-005).
 */
const { chromium } = require('@playwright/test');
const { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-02');

async function installOrbit(page) {
  await page.goto(`${baseUrl}/`);
  await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 30000 });
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('button', { name: 'Download & try on this device' }).click();
  await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 60000 });
  await page.getByRole('link', { name: '▶ Play game' }).click();
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Save state', exact: true }).click();
  await page.getByText('State saved on this device', { exact: true }).waitFor();
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  });
  if (!controlled) throw new Error('Service worker is not controlling the page after install');
  return page.url();
}

async function run() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-offline-'));
  const results = {};
  try {
    // --- Phase A: install online into a persistent profile ---
    let context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    let page = context.pages()[0] || (await context.newPage());
    page.on('pageerror', (error) => console.error(`PAGEERROR ${error.message}`));
    await installOrbit(page);
    console.log('OFFLINE_PWA_INSTALL_PASS');
    await context.close();

    // --- OFF-001 / OFF-002 / OFF-003: fresh Chromium process, network off before navigate ---
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    page = context.pages()[0] || (await context.newPage());
    await context.setOffline(true);
    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 30000 });
    console.log('OFF_001_COLD_START_LIBRARY_PASS');
    await page.getByRole('link', { name: 'Play game' }).click();
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 30000 });
    console.log('OFF_002_COLD_START_BOOT_PASS');
    await page.getByRole('button', { name: 'Load state', exact: true }).click();
    await page.getByText('State restored', { exact: true }).waitFor({ timeout: 15000 });
    console.log('OFF_003_COLD_START_SAVE_PASS');
    await page.screenshot({ path: join(evidenceDir, 'screenshots', 'offline-cold-start.png'), fullPage: true });
    results.coldStart = true;

    // --- OFF-004: evict local game bytes + optional core cache while offline ---
    // Keep /play HTML cached so the Player boots and auditInstallation can fail closed.
    const eviction = await page.evaluate(async () => {
      const keys = await caches.keys();
      const shell = keys.find((key) => key.startsWith('retro-shell-'));
      if (!shell) return { ok: false, reason: 'no-shell-cache' };
      const cache = await caches.open(shell);
      const coreKeys = (await cache.keys()).filter((request) =>
        new URL(request.url).pathname.startsWith('/cores/'),
      );
      for (const request of coreKeys) await cache.delete(request);
      const root = await navigator.storage.getDirectory();
      let removedAssets = 0;
      try {
        const games = await root.getDirectoryHandle('games');
        // eslint-disable-next-line no-restricted-syntax
        for await (const name of games.keys()) {
          await games.removeEntry(name, { recursive: true });
          removedAssets += 1;
        }
      } catch (error) {
        return { ok: false, reason: 'opfs-evict-failed', error: String(error) };
      }
      return {
        ok: removedAssets > 0 || coreKeys.length > 0,
        removedAssets,
        removedCores: coreKeys.length,
        shell,
      };
    });
    if (!eviction.ok) throw new Error(`OFF-004 setup failed: ${JSON.stringify(eviction)}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByText(/missing or damaged|not installed|Reinstall/i)
      .waitFor({ timeout: 30000 });
    console.log(`OFF_004_CORE_EVICTION_PASS ${JSON.stringify(eviction)}`);
    results.off004 = eviction;

    // Reinstall online so OFF-005 has a healthy session
    await context.setOffline(false);
    await page.goto(`${baseUrl}/games/orbit-catch`);
    await page.getByRole('button', { name: 'Download & try on this device' }).click();
    await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 60000 });
    await page.getByRole('link', { name: '▶ Play game' }).click();
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 30000 });

    // --- OFF-005: register a waiting SW with a new VERSION; gameplay must continue ---
    const swPath = join(__dirname, '..', 'public', 'sw.js');
    const originalSw = readFileSync(swPath, 'utf8');
    const bumped = originalSw.replace(/retro-shell-v3/g, 'retro-shell-v3-waiting-test');
    const backup = `${swPath}.bak-offline-test`;
    writeFileSync(backup, originalSw);
    writeFileSync(swPath, bumped);
    try {
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
        // Wait until a waiting worker appears (or installing finishes into waiting).
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const current = await navigator.serviceWorker.getRegistration();
          if (current?.waiting || current?.installing) return true;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error('Waiting service worker did not appear');
      });
      // Active gameplay controls must still work while the new SW waits.
      await page.getByRole('button', { name: 'Save state', exact: true }).click();
      await page.getByText('State saved on this device', { exact: true }).waitFor({ timeout: 15000 });
      const stillControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
      if (!stillControlled) throw new Error('Controller lost during waiting SW update');
      console.log('OFF_005_SW_UPDATE_NO_DISRUPT_PASS');
      results.off005 = true;
    } finally {
      writeFileSync(swPath, readFileSync(backup, 'utf8'));
      rmSync(backup, { force: true });
    }

    await context.close();
    mkdirSync(join(evidenceDir), { recursive: true });
    writeFileSync(join(evidenceDir, 'offline-pwa-20261020.txt'), JSON.stringify(results, null, 2));
    console.log(`OFFLINE_PWA_PASS ${JSON.stringify(results)}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
