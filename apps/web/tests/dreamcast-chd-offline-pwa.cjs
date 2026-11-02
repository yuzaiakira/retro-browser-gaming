/**
 * Dreamcast CHD Compose offline PWA cold-start (Playwright).
 *
 * Requires Compose at RETRO_TEST_BASE_URL and seeded mit-dreamcast-dot-chd.
 * Scope: SERVICE_WORKER_OFFLINE only — not OS PWA / physical devices.
 *
 * Marker: DREAMCAST_CHD_OFFLINE_PWA_PASS
 *
 * Usage:
 *   RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium \
 *   node tests/dreamcast-chd-offline-pwa.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { PNG } = require('pngjs');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-12');
const shotDir = join(evidenceDir, 'dreamcast-chd', 'screenshots');
const slug = 'mit-dreamcast-dot-chd';
const title = 'MIT Dreamcast Dot CHD';

mkdirSync(join(evidenceDir, 'dreamcast-chd'), { recursive: true });
mkdirSync(shotDir, { recursive: true });

function trackAllNetwork(page) {
  const hits = [];
  const onRequest = (req) => {
    const url = req.url();
    if (/^(data:|blob:|chrome-|about:)/i.test(url)) return;
    hits.push({ url, resourceType: req.resourceType() });
  };
  page.on('request', onRequest);
  return {
    assertNoServerDeps(label) {
      page.off('request', onRequest);
      const bad = hits.filter((h) =>
        /\/api\/|object-store|seaweed|:9000|cdn\.|github\.|googleapis/i.test(h.url),
      );
      if (bad.length) {
        throw new Error(`${label} server dependency: ${JSON.stringify(bad.slice(0, 8))}`);
      }
    },
  };
}

async function waitMenuEnabled(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 300000,
  });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 300000 });
}

async function ensureInstalled(page) {
  await page.goto(`${baseUrl}/games/${slug}`);
  const titleHeading = page.getByRole('heading', { name: title, exact: true });
  const unavailable = page.getByRole('heading', { name: /Game unavailable/i });
  await titleHeading.or(unavailable).first().waitFor({ state: 'visible', timeout: 60000 });
  if (await unavailable.count()) {
    throw new Error(`Catalog missing ${title}. Seed mit-dreamcast-dot-chd first.`);
  }
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 600000 });
}

async function quickSave(page) {
  await page.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page.waitForTimeout(2000);
}

async function quickLoad(page) {
  await page.getByRole('button', { name: 'Quick load', exact: true }).click();
  await page.waitForTimeout(2000);
}

async function captureFrame(page) {
  const frame = page.frameLocator('iframe.game-frame, iframe[title*="emulator" i], iframe').first();
  // Prefer canvas inside frame
  const dataUrl = await page.evaluate(async () => {
    const iframe = document.querySelector('iframe.game-frame, iframe[title*="emulator" i], iframe');
    if (!iframe?.contentDocument) return null;
    const doc = iframe.contentDocument;
    doc.querySelectorAll('.ejs_menu_bar,.ejs_settings_parent,.ejs_virtualGamepad,.ejs_context_menu').forEach((el) => {
      el.style.display = 'none';
    });
    const c = doc.querySelector('canvas');
    if (!c) return null;
    const t = doc.createElement('canvas');
    t.width = c.width;
    t.height = c.height;
    t.getContext('2d').drawImage(c, 0, 0);
    return t.toDataURL('image/png');
  });
  if (!dataUrl) throw new Error('no canvas');
  return PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));
}

function brightCount(png) {
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] > 160 && png.data[i + 1] > 160 && png.data[i + 2] > 160) n++;
  }
  return n;
}

async function run() {
  const profile = mkdtempSync(join(tmpdir(), 'dc-chd-offline-'));
  const status = { slug, title, baseUrl };
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-features=SharedArrayBuffer',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
  const context = await browser.newContext({
    baseURL: baseUrl,
    ignoreHTTPSErrors: true,
    storageState: undefined,
    viewport: { width: 1280, height: 900 },
  });
  // Persist profile via userDataDir is better; Playwright chromium.launchPersistentContext:
  await browser.close();

  const persistent = await chromium.launchPersistentContext(profile, {
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-features=SharedArrayBuffer',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
    viewport: { width: 1280, height: 900 },
  });
  const page = await persistent.newPage();
  page.setDefaultTimeout(300000);

  try {
    await ensureInstalled(page);
    await page.goto(`${baseUrl}/play/${slug}`);
    await waitMenuEnabled(page);
    await page.waitForTimeout(12000);

    let onlinePng = await captureFrame(page);
    writeFileSync(join(shotDir, 'chd-online-idle.png'), PNG.sync.write(onlinePng));
    status.onlineBright = brightCount(onlinePng);
    if (status.onlineBright < 80) throw new Error('online CHD boot not visible');

    await quickSave(page);
    status.savedOnline = true;

    // Offline cold start
    await persistent.setOffline(true);
    await page.close();
    const cold = await persistent.newPage();
    cold.setDefaultTimeout(300000);
    const net = trackAllNetwork(cold);
    await cold.goto(`${baseUrl}/play/${slug}`, { waitUntil: 'domcontentloaded' });
    await waitMenuEnabled(cold);
    await cold.waitForTimeout(15000);
    net.assertNoServerDeps('offline-chd-cold');

    const offlinePng = await captureFrame(cold);
    writeFileSync(join(shotDir, 'chd-offline-idle.png'), PNG.sync.write(offlinePng));
    status.offlineBright = brightCount(offlinePng);
    if (status.offlineBright < 80) throw new Error('offline CHD boot not visible');

    await quickLoad(cold);
    await cold.waitForTimeout(2000);
    status.loadedOffline = true;

    // Save while offline
    await quickSave(cold);
    status.savedOffline = true;

    status.marker = 'DREAMCAST_CHD_OFFLINE_PWA_PASS';
    console.log('DREAMCAST_CHD_OFFLINE_PWA_PASS', JSON.stringify({
      onlineBright: status.onlineBright,
      offlineBright: status.offlineBright,
    }));
    writeFileSync(join(evidenceDir, 'dreamcast-chd', 'offline-status.json'), JSON.stringify(status, null, 2) + '\n');
  } catch (err) {
    status.marker = 'DREAMCAST_CHD_OFFLINE_PWA_FAIL';
    status.error = String(err && err.stack ? err.stack : err);
    console.error('DREAMCAST_CHD_OFFLINE_PWA_FAIL', err);
    writeFileSync(join(evidenceDir, 'dreamcast-chd', 'offline-status.json'), JSON.stringify(status, null, 2) + '\n');
    process.exitCode = 1;
  } finally {
    await persistent.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
