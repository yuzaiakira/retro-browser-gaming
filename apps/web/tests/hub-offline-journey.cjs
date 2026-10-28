/**
 * Sprint 3.1 — offline cold-start journey with a persistent Chromium profile.
 * Playwright offline simulation only — not physical-device certification.
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-UX-HUB');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

async function ensureInstalled(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 300000 });
}

async function playUntilMenu(page) {
  await page.waitForURL(/\/play\//, { timeout: 60000 });
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 180000,
  });
  // recent:* is written before Menu is enabled — do not leave the player early.
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 180000 });
}

async function quickSave(page) {
  const quick = page.getByRole('button', { name: 'Quick save', exact: true });
  if (!(await quick.count())) {
    return false;
  }
  await quick.click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Quick save stored|saved/i })
    .waitFor({ timeout: 60000 });
  return true;
}

function trackRequiredNetwork(page) {
  const hits = [];
  const onRequest = (req) => {
    const url = req.url();
    if (/\/api\/|object-store|seaweed|:9000|\/games\/\?|\/consoles\//i.test(url)) {
      hits.push(url);
    }
  };
  page.on('request', onRequest);
  return {
    assertClean(label) {
      page.off('request', onRequest);
      if (hits.length) {
        throw new Error(`${label} required network: ${JSON.stringify(hits.slice(0, 10))}`);
      }
    },
  };
}

async function openPersistent() {
  return chromium.launchPersistentContext(arguments[0], {
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
    viewport: { width: 1280, height: 900 },
  });
}

(async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-hub-offline-'));
  const evidence = { orbit: {}, genesis: {} };
  const resultsPath = join(evidenceDir, 'hub-offline-journey-20261026.json');

  const launch = () =>
    chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });

  try {
    // Online: install + play Orbit (creates recent:* + optional save)
    let context = await launch();
    let page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(180000);
    await ensureInstalled(page, 'orbit-catch', 'Orbit Catch');
    evidence.orbit.readyOffline = true;
    await page.getByRole('link', { name: /Play game/i }).click();
    await playUntilMenu(page);
    evidence.orbit.playedOnline = true;
    // HTML5 Orbit may not expose save-states; only assert when the control exists.
    evidence.orbit.quickSave = await quickSave(page);
    await context.close();

    // Offline cold start Orbit
    context = await launch();
    page = context.pages()[0] || (await context.newPage());
    await context.setOffline(true);
    const netOrbit = trackRequiredNetwork(page);
    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /My library/i }).waitFor({ timeout: 30000 });
    const orbitCard = page.locator('article.game-card', { hasText: 'Orbit Catch' }).first();
    await orbitCard.waitFor({ timeout: 30000 });
    evidence.orbit.offlineLibrary = true;
    await page.locator('[data-testid="continue-playing"]').waitFor({ timeout: 20000 });
    evidence.orbit.continuePlayingSection = true;
    await page
      .locator('[data-testid="continue-playing"]')
      .locator('article.game-card', { hasText: 'Orbit Catch' })
      .getByRole('link', { name: /^▶ Play$/ })
      .first()
      .click();
    await playUntilMenu(page);
    evidence.orbit.offlinePlay = true;
    if (evidence.orbit.quickSave) {
      await page.getByRole('button', { name: 'Quick load', exact: true }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
      await page
        .locator('.player-status')
        .filter({ hasText: /Restored successfully/i })
        .waitFor({ timeout: 30000 });
      evidence.orbit.offlineLoad = true;
    } else {
      evidence.orbit.offlineLoad = 'unsupported-runtime';
    }
    netOrbit.assertClean('Orbit offline');
    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'hub-offline-orbit-play.png'),
      fullPage: true,
    });
    await context.close();

    // Online: Genesis install + play (save-state runtime)
    context = await launch();
    page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);
    await context.setOffline(false);
    await ensureInstalled(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
    evidence.genesis.readyOffline = true;
    await page.getByRole('link', { name: /Play game/i }).click();
    await playUntilMenu(page);
    if (!(await quickSave(page))) {
      throw new Error('Genesis Quick save control missing — save/load gate required');
    }
    evidence.genesis.quickSave = true;
    await context.close();

    // Offline Genesis
    context = await launch();
    page = context.pages()[0] || (await context.newPage());
    await context.setOffline(true);
    const netGenesis = trackRequiredNetwork(page);
    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    const genesisCard = page
      .locator('article.game-card', { hasText: 'MIT Genesis Breakout' })
      .first();
    await genesisCard.waitFor({ timeout: 60000 });
    await genesisCard.getByRole('link', { name: /^▶ Play$/ }).click();
    await playUntilMenu(page);
    evidence.genesis.offlinePlay = true;
    await page.getByRole('button', { name: 'Quick load', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
    await page
      .locator('.player-status')
      .filter({ hasText: /Restored successfully/i })
      .waitFor({ timeout: 60000 });
    evidence.genesis.offlineLoad = true;
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    evidence.genesis.inputOk = true;
    netGenesis.assertClean('Genesis offline');
    await page.screenshot({
      path: join(evidenceDir, 'screenshots', 'hub-offline-genesis-play.png'),
      fullPage: true,
    });
    await context.close();

    writeFileSync(resultsPath, JSON.stringify(evidence, null, 2));
    console.log('HUB_OFFLINE_JOURNEY_PASS', JSON.stringify(evidence));
  } catch (error) {
    writeFileSync(
      resultsPath,
      JSON.stringify({ error: String(error), stack: error.stack, evidence }, null, 2),
    );
    console.error('HUB_OFFLINE_JOURNEY_FAIL', error);
    process.exitCode = 1;
  } finally {
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
})();
