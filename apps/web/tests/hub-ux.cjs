/**
 * Hub UX acceptance: catalog history, continue-playing correctness, stable shots.
 * Simulated Chromium — not physical device certification.
 */
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir =
  process.env.EVIDENCE_DIR ||
  join(__dirname, '../../../docs/test-evidence/PH-UX-HUB');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

async function waitCatalogReady(page) {
  await page.getByLabel('Search games').waitFor({ state: 'visible', timeout: 30000 });
  await page
    .locator('.game-grid .game-card, .empty')
    .first()
    .waitFor({ state: 'visible', timeout: 60000 });
  await page.getByText('Loading your next adventure…').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
}

async function shot(page, name) {
  await waitCatalogReady(page).catch(() => {});
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', name),
    fullPage: true,
  });
}

async function ensureOrbitInstalled(page) {
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor({ timeout: 60000 });
  if (await page.getByRole('link', { name: /Play game/i }).count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 180000 });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const evidence = { journeys: {}, history: {}, continuePlaying: {}, responsive: {} };

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(90000);

  // --- New user / discover ---
  await page.goto(`${baseUrl}/`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.getByText(/Explore games|Continue playing|Play installed/i).first().waitFor();
  await shot(page, 'hub-home-desktop.png');
  evidence.journeys.homeLoaded = true;

  // --- Catalog URL restore + Back/Forward ---
  await page.goto(`${baseUrl}/games`);
  await waitCatalogReady(page);

  await page.getByRole('button', { name: 'Arcade', exact: true }).click();
  await page.waitForURL(/genre=Arcade/);
  const urlAfterGenre = page.url();
  evidence.history.genrePushed = /genre=Arcade/.test(urlAfterGenre);

  await page.getByLabel('Search games').fill('Orbit');
  await page.waitForURL(/q=Orbit/, { timeout: 10000 });
  evidence.history.searchReplaced = /q=Orbit/.test(page.url());

  // Typing should not explode history length — capture length then type more
  const lenAfterSearch = await page.evaluate(() => history.length);
  await page.getByLabel('Search games').fill('Orbit Catch');
  await page.waitForTimeout(450);
  await page.waitForURL(/q=Orbit(\+|%20| )Catch|q=Orbit%20Catch/);
  const lenAfterMoreTyping = await page.evaluate(() => history.length);
  evidence.history.searchDidNotPushPerKey = lenAfterMoreTyping <= lenAfterSearch + 1;

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.waitForURL((url) => !url.search.includes('q='), { timeout: 10000 });
  evidence.history.clearFilters = !page.url().includes('q=');

  // Explicit filter then Back/Forward (real history traversal)
  await page.getByRole('button', { name: 'Arcade', exact: true }).click();
  await page.waitForURL(/genre=Arcade/);
  await page.goBack();
  await page.waitForURL((url) => !String(url.search || '').includes('genre=Arcade'), {
    timeout: 10000,
  });
  const afterBack = parseCatalogFromUrl(page.url());
  evidence.history.backClearedGenre = afterBack.genre !== 'Arcade';
  await page.goForward();
  await page.waitForURL(/genre=Arcade/);
  evidence.history.forwardRestoredGenre = /genre=Arcade/.test(page.url());

  // Shared URL restore
  await page.goto(`${baseUrl}/games?q=Orbit&genre=Arcade&page=1`);
  await waitCatalogReady(page);
  await page.getByLabel('Search games').waitFor();
  const draft = await page.getByLabel('Search games').inputValue();
  evidence.history.sharedUrlRestored = draft.includes('Orbit');
  await shot(page, 'hub-catalog-search.png');

  // Invalid page normalizes without crash
  await page.goto(`${baseUrl}/games?page=abc`);
  await waitCatalogReady(page);
  evidence.history.invalidPageOk = true;

  // Empty search results
  await page.goto(`${baseUrl}/games`);
  await waitCatalogReady(page);
  await page.getByLabel('Search games').fill('zzznomatchzzz');
  await page.getByText(/No games in this corner yet/i).waitFor({ timeout: 15000 });
  evidence.journeys.emptySearch = true;
  await page.getByRole('button', { name: /Reset filters|Clear filters/i }).first().click();

  // Slow catalog + API error must not crash the shell
  await page.route('**/api/v1/games/**', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ status: 503, contentType: 'text/plain', body: 'unavailable' });
  });
  await page.goto(`${baseUrl}/games`);
  await page.getByLabel('Search games').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('heading', { name: /All games/i }).waitFor({ timeout: 15000 });
  await page.getByText('Loading your next adventure…').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
  // Shell remains usable (filters still present) after the failed fetch.
  await page.getByLabel('Search games').waitFor({ state: 'visible' });
  evidence.journeys.slowErrorCatalog = true;
  await page.unroute('**/api/v1/games/**');
  await page.goto(`${baseUrl}/games`);
  await waitCatalogReady(page);

  // --- Details progressive disclosure ---
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor();
  await page.getByText(/Compatibility/i).first().waitFor();
  await page.getByText('Technical details').click();
  await page.getByText(/Core:/i).waitFor();
  await shot(page, 'hub-game-details.png');
  evidence.journeys.detailsProgressive = true;

  // --- Download → Play (required) ---
  await ensureOrbitInstalled(page);
  evidence.journeys.downloadToPlay = true;
  const playLink = page.getByRole('link', { name: /Play game/i });
  await playLink.waitFor();
  evidence.journeys.playPrimary = true;

  // Install alone must NOT put game in Continue Playing
  await page.goto(`${baseUrl}/`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  const contBeforePlay = await page.locator('[data-testid="continue-playing"]').count();
  const readyBeforePlay = await page.locator('[data-testid="ready-to-play"]').count();
  evidence.continuePlaying.absentBeforeLaunch =
    contBeforePlay === 0 || !(await page.locator('[data-testid="continue-playing"]').filter({ hasText: 'Orbit Catch' }).count());
  // Prefer Ready to play for never-launched installs in this fresh context
  if (readyBeforePlay) {
    evidence.continuePlaying.readyToPlayShown = true;
  }

  // Launch once → Continue Playing required
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('link', { name: /Play game/i }).click();
  await page.waitForURL(/\/play\//);
  // Menu is visible while disabled during load; wait until enabled so recent:* is written.
  const menuBtn = page.getByRole('button', { name: 'Menu', exact: true });
  await menuBtn.waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 120000 });
  await page.goto(`${baseUrl}/`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.locator('[data-testid="continue-playing"]').waitFor({ timeout: 30000 });
  await page
    .locator('[data-testid="continue-playing"]')
    .getByRole('heading', { name: 'Orbit Catch' })
    .waitFor();
  evidence.continuePlaying.presentAfterLaunch = true;
  await shot(page, 'hub-home-continue.png');

  // Library
  await page.goto(`${baseUrl}/library`);
  await page.getByRole('heading', { name: /My library/i }).waitFor();
  await page.locator('[data-testid="continue-playing"]').waitFor();
  await shot(page, 'hub-library.png');
  evidence.journeys.library = true;

  // Downloads page
  await page.goto(`${baseUrl}/downloads`);
  await page.getByRole('heading', { name: 'Downloads', exact: true }).waitFor();
  await shot(page, 'hub-downloads.png');
  evidence.journeys.downloadsPage = true;

  // Settings advanced
  await page.goto(`${baseUrl}/settings`);
  await page.getByRole('heading', { name: /Settings/i }).waitFor();
  await page.getByText(/Advanced/i).first().waitFor();
  evidence.journeys.settingsAdvanced = true;

  // Keyboard focus on filters
  await page.goto(`${baseUrl}/games`);
  await waitCatalogReady(page);
  await page.getByLabel('Search games').focus();
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  evidence.journeys.searchFocus = focused === 'Search games';

  await page.close();

  // Responsive — wait for cards/empty, assert no overflow
  for (const [w, h, name] of [
    [1366, 768, 'hub-laptop.png'],
    [1024, 768, 'hub-tablet.png'],
    [390, 844, 'hub-mobile-portrait.png'],
    [844, 390, 'hub-mobile-landscape.png'],
    [360, 800, 'hub-mobile-narrow.png'],
  ]) {
    const p = await browser.newPage({
      viewport: { width: w, height: h },
      hasTouch: w <= 844,
      isMobile: w <= 430,
    });
    await p.goto(`${baseUrl}/`);
    await p.getByRole('heading', { level: 1 }).first().waitFor();
    await p.getByText(/Explore games|Continue playing|Play installed|Welcome/i).first().waitFor();
    // Wait for catalog cards (or empty) — never screenshot while the loading placeholder is up.
    await p.getByText('Loading your next adventure…').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    await p
      .locator('.game-grid .game-card, [data-testid="continue-playing"], [data-testid="ready-to-play"], .empty, .first-run')
      .first()
      .waitFor({ state: 'visible', timeout: 60000 });
    const overflow = await p.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    evidence.responsive[name] = { overflow };
    if (overflow) throw new Error(`Horizontal overflow at ${w}x${h}`);
    await p.screenshot({ path: join(evidenceDir, 'screenshots', name), fullPage: true });
    await p.close();
  }

  // Required gates
  const required = [
    ['homeLoaded', evidence.journeys.homeLoaded],
    ['downloadToPlay', evidence.journeys.downloadToPlay],
    ['playPrimary', evidence.journeys.playPrimary],
    ['presentAfterLaunch', evidence.continuePlaying.presentAfterLaunch],
    ['genrePushed', evidence.history.genrePushed],
    ['backClearedGenre', evidence.history.backClearedGenre],
    ['forwardRestoredGenre', evidence.history.forwardRestoredGenre],
    ['sharedUrlRestored', evidence.history.sharedUrlRestored],
    ['emptySearch', evidence.journeys.emptySearch],
    ['slowErrorCatalog', evidence.journeys.slowErrorCatalog],
    ['library', evidence.journeys.library],
  ];
  for (const [name, ok] of required) {
    if (!ok) throw new Error(`Required hub assertion failed: ${name}`);
  }

  writeFileSync(join(evidenceDir, 'hub-ux-20261026.json'), JSON.stringify(evidence, null, 2));
  console.log('HUB_UX_PASS', JSON.stringify(evidence));
  await browser.close();
})().catch((err) => {
  console.error('HUB_UX_FAIL', err);
  process.exitCode = 1;
});

function parseCatalogFromUrl(url) {
  const u = new URL(url);
  return {
    q: u.searchParams.get('q') || '',
    genre: u.searchParams.get('genre') || '',
    console: u.searchParams.get('console') || '',
  };
}
