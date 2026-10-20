/**
 * Offline PWA acceptance: persistent-profile cold start, missing emulator-core
 * eviction (OFF-004), and waiting SW update without disrupting gameplay (OFF-005).
 */
const { chromium } = require('@playwright/test');
const { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } = require('node:fs');
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
}

async function installGenesis(page) {
  await page.goto(`${baseUrl}/games/mit-genesis-breakout`);
  await page.getByRole('heading', { name: 'MIT Genesis Breakout' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Download & try on this device' }).click();
  await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 300000 });
  await page.getByRole('link', { name: '▶ Play game' }).click();
  await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
}

async function run() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-offline-'));
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
    await installOrbit(page);
    console.log('OFFLINE_PWA_INSTALL_PASS');
    await context.close();

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

    // --- OFF-004: missing emulator-core Cache Storage asset (PDR: core asset missing) ---
    await context.setOffline(false);
    await installGenesis(page);
    const coreProbe = await page.evaluate(async () => {
      const keys = await caches.keys();
      const shell = keys.find((key) => key.startsWith('retro-shell-'));
      if (!shell) return { ok: false, reason: 'no-shell-cache' };
      const cache = await caches.open(shell);
      const cores = (await cache.keys())
        .map((request) => new URL(request.url).pathname)
        .filter((path) => path.startsWith('/cores/') && path.endsWith('.data'));
      return { ok: cores.length > 0, shell, cores };
    });
    if (!coreProbe.ok) throw new Error(`OFF-004 prerequisite failed: ${JSON.stringify(coreProbe)}`);

    await context.setOffline(true);
    const eviction = await page.evaluate(async (shellName) => {
      const cache = await caches.open(shellName);
      // Prefer the active non-legacy wasm package for the installed Genesis core.
      const preferred = (await cache.keys()).find((request) => {
        const path = new URL(request.url).pathname;
        return path.includes('genesis_plus_gx-wasm.data') && !path.includes('legacy');
      });
      const target =
        preferred ||
        (await cache.keys()).find((request) => {
          const path = new URL(request.url).pathname;
          return path.startsWith('/cores/') && path.endsWith('.data');
        });
      if (!target) return { ok: false, reason: 'no-core-data' };
      const deletedPath = new URL(target.url).pathname;
      await cache.delete(target);
      const stillThere = await cache.match(deletedPath);
      // OPFS game bytes must remain so this is core-missing, not ROM-missing.
      let opfsGames = 0;
      try {
        const games = await (await navigator.storage.getDirectory()).getDirectoryHandle('games');
        // eslint-disable-next-line no-restricted-syntax
        for await (const _name of games.keys()) opfsGames += 1;
      } catch {
        opfsGames = -1;
      }
      return {
        ok: !stillThere && opfsGames > 0,
        deletedPath,
        opfsGames,
        shell: shellName,
      };
    }, coreProbe.shell);
    if (!eviction.ok) throw new Error(`OFF-004 setup failed: ${JSON.stringify(eviction)}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByText(/missing or damaged|not installed|Reinstall/i)
      .waitFor({ timeout: 30000 });
    console.log(`OFF_004_CORE_MISSING_PASS ${JSON.stringify(eviction)}`);

    // Recoverable UX: repair online must restore core and allow boot again.
    await context.setOffline(false);
    await page.goto(`${baseUrl}/games/mit-genesis-breakout`);
    await page.getByRole('button', { name: 'Download & try on this device' }).click();
    await page.getByRole('link', { name: '▶ Play game' }).waitFor({ timeout: 300000 });
    await page.getByRole('link', { name: '▶ Play game' }).click();
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });
    // Confirm the previously deleted core path is present again.
    const restored = await page.evaluate(async (deletedPath) => {
      const keys = await caches.keys();
      const shell = keys.find((key) => key.startsWith('retro-shell-'));
      if (!shell) return false;
      return !!(await (await caches.open(shell)).match(deletedPath));
    }, eviction.deletedPath);
    if (!restored) throw new Error(`OFF-004 recovery did not restore ${eviction.deletedPath}`);
    console.log('OFF_004_CORE_RECOVERY_PASS');
    results.off004 = { ...eviction, recovered: true, restoredPath: eviction.deletedPath };

    // --- OFF-005: waiting SW must not disrupt active gameplay ---
    const swPath = join(__dirname, '..', 'public', 'sw.js');
    const originalSw = readFileSync(swPath, 'utf8');
    const bumped = originalSw.replace(/retro-shell-v4/g, 'retro-shell-v4-waiting-test');
    const backup = `${swPath}.bak-offline-test`;
    writeFileSync(backup, originalSw);
    writeFileSync(swPath, bumped);
    try {
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const current = await navigator.serviceWorker.getRegistration();
          if (current?.waiting || current?.installing) return true;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error('Waiting service worker did not appear');
      });
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
    writeFileSync(join(evidenceDir, 'offline-pwa-off004-core-20261020.txt'), JSON.stringify(results, null, 2));
    console.log(`OFFLINE_PWA_PASS ${JSON.stringify(results)}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
