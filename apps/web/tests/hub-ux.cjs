/**
 * Hub UX journeys (Discover / Library / Downloads / filters).
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

async function shot(page, name) {
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', name),
    fullPage: true,
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const evidence = { journeys: {}, responsive: {} };

  // Journey B-ish + catalog filters + home hierarchy
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.setDefaultTimeout(60000);
    await page.goto(`${baseUrl}/`);
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await shot(page, 'hub-home-desktop.png');
    evidence.journeys.homeLoaded = true;

    // Filters + URL sync on All games
    await page.goto(`${baseUrl}/games`);
    await page.getByRole('searchbox').or(page.getByLabel('Search games')).waitFor();
    await page.getByLabel('Search games').fill('Orbit');
    await page.waitForTimeout(400);
    await page.waitForURL(/q=Orbit|search=Orbit/);
    evidence.journeys.catalogUrlSync = /q=Orbit|search=Orbit/.test(page.url());
    await shot(page, 'hub-catalog-search.png');

    const clear = page.getByRole('button', { name: 'Clear filters' });
    if (await clear.isVisible().catch(() => false)) await clear.click();

    // Game details progressive disclosure
    await page.goto(`${baseUrl}/games/orbit-catch`);
    await page.getByRole('heading', { name: 'Orbit Catch' }).waitFor();
    await page.getByText(/Compatibility/i).first().waitFor();
    const tech = page.getByText('Technical details');
    if (await tech.count()) {
      await tech.click();
      await page.getByText(/Core:/i).waitFor();
    }
    await shot(page, 'hub-game-details.png');
    evidence.journeys.detailsProgressive = true;

    // Install / play path if needed
    const play = page.getByRole('link', { name: /Play game/i });
    if (await play.count()) {
      evidence.journeys.playPrimary = true;
    } else {
      const download = page.getByRole('button', { name: /Download/i });
      await download.first().click();
      await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 180000 });
      evidence.journeys.downloadToPlay = true;
    }

    await page.goto(`${baseUrl}/library`);
    await page.getByRole('heading', { name: /My library/i }).waitFor();
    await shot(page, 'hub-library.png');
    evidence.journeys.library = true;

    // Continue playing on home after install
    await page.goto(`${baseUrl}/`);
    const continueBtn = page.getByRole('link', { name: /Continue playing/i });
    if (await continueBtn.count()) {
      evidence.journeys.continuePlayingCta = true;
    }

    await page.goto(`${baseUrl}/downloads`);
    await page.getByRole('heading', { name: 'Downloads' }).waitFor();
    await shot(page, 'hub-downloads.png');
    evidence.journeys.downloadsPage = true;

    await page.goto(`${baseUrl}/settings`);
    await page.getByRole('heading', { name: /Settings/i }).waitFor();
    await page.getByText(/Advanced/i).first().waitFor();
    evidence.journeys.settingsAdvanced = true;
    await page.close();
  }

  // Responsive samples
  for (const [w, h, name] of [
    [1366, 768, 'hub-laptop.png'],
    [1024, 768, 'hub-tablet.png'],
    [390, 844, 'hub-mobile-portrait.png'],
    [844, 390, 'hub-mobile-landscape.png'],
    [360, 800, 'hub-mobile-narrow.png'],
  ]) {
    const page = await browser.newPage({
      viewport: { width: w, height: h },
      hasTouch: w <= 844,
      isMobile: w <= 430,
    });
    await page.goto(`${baseUrl}/`);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    evidence.responsive[name] = { overflow };
    if (overflow) throw new Error(`Horizontal overflow at ${w}x${h}`);
    await shot(page, name);
    await page.close();
  }

  writeFileSync(join(evidenceDir, 'hub-ux-20261026.json'), JSON.stringify(evidence, null, 2));
  console.log('HUB_UX_PASS', JSON.stringify(evidence));
  await browser.close();
})().catch((err) => {
  console.error('HUB_UX_FAIL', err);
  process.exitCode = 1;
});
