/**
 * NES / FCEUmm regression after FDS BIOS integration.
 *
 * Proves:
 * - NES boots without FDS BIOS / disksys.rom
 * - Catalog install + launch + input + save/load
 * - Offline cold-start for NES
 * - Switching NES ↔ FDS does not leak BIOS requirement into NES
 *
 * Usage:
 *   RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium \
 *   node tests/nes-fceumm-regression.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-12');
const shotDir = join(evidenceDir, 'fds', 'screenshots');
const nesSlug = 'mit-nes-table-tennis';
const nesTitle = 'MIT NES Table Tennis';
const fdsSlug = 'mit-fds-move-demo';
const fdsTitle = 'MIT FDS Move Demo';
const biosPath = join(
  __dirname,
  '..',
  '..',
  '..',
  '.private-runtime',
  'firmware',
  'fds',
  'disksys.rom',
);
const EXPECT_BIOS_SHA =
  '6ce74ea4e9407c8d1175a58b7af08f073fa6b9f9b54e4f4954828ae1b6872ba6';

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

async function ensureInstalled(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  const titleHeading = page.getByRole('heading', { name: title, exact: true });
  const unavailable = page.getByRole('heading', { name: /Game unavailable/i });
  await titleHeading.or(unavailable).first().waitFor({ state: 'visible', timeout: 60000 });
  if (await unavailable.count()) {
    throw new Error(`Catalog missing ${title}`);
  }
  const play = page.getByRole('link', { name: /Play game/i });
  if (await play.count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 600000 });
}

async function playFromDetails(page) {
  await page.getByRole('link', { name: /Play game/i }).click();
  await page.waitForURL(/\/play\//, { timeout: 60000 });
  await waitMenuEnabled(page);
}

async function quickSave(page) {
  await page.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Quick save stored|saved/i })
    .waitFor({ timeout: 120000 });
}

async function quickLoad(page) {
  await page.getByRole('button', { name: 'Quick load', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
  await page
    .locator('.player-status')
    .filter({ hasText: /Restored successfully/i })
    .waitFor({ timeout: 120000 });
}

async function importOpenDiskSysRom(page) {
  const bytes = readFileSync(biosPath);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== EXPECT_BIOS_SHA) throw new Error(`BIOS sha mismatch ${sha}`);
  await page.goto(`${baseUrl}/settings`);
  await page.evaluate(async (payload) => {
    const openDb = () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('rbg-user-bios', 1);
        req.onerror = () => reject(req.error || Error('BIOS_IDB'));
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('bios')) {
            db.createObjectStore('bios', { keyPath: 'slotId' });
          }
        };
        req.onsuccess = () => resolve(req.result);
      });
    const db = await openDb();
    try {
      const blob = new Blob([new Uint8Array(payload.bytes)], {
        type: 'application/octet-stream',
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('bios', 'readwrite');
        tx.objectStore('bios').put({
          slotId: 'fds',
          filename: 'disksys.rom',
          sha256: payload.sha,
          byteSize: payload.bytes.length,
          blob,
          importedAt: Date.now(),
          coreHint: 'fceumm',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, { bytes: [...bytes], sha });
}

async function assertNoDisksysInNesLaunch(page) {
  return page.evaluate(async () => {
    const iframe = document.querySelector('.player-stage iframe');
    if (!iframe?.contentWindow) return { ok: false, reason: 'no-iframe' };
    // Probe parent-side: NES path must not require user BIOS when entry is .nes
    // Frame may expose EJS_biosUrl only for non-FDS mounts.
    const win = iframe.contentWindow;
    const biosUrl = win.EJS_biosUrl;
    return {
      ok: biosUrl == null || biosUrl === '' || biosUrl === undefined,
      biosUrl: biosUrl || null,
    };
  });
}

async function launchPersistent(userDataDir) {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 1280, height: 900 },
  });
}

(async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-nes-fceumm-reg-'));
  const evidence = { gates: {}, productApprovalStatus: 'n/a-nes' };
  const resultsPath = join(evidenceDir, 'fds', 'nes-fceumm-regression.json');
  let context;

  try {
    context = await launchPersistent(userDataDir);
    let page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);

    // 1) NES without any FDS BIOS in IDB
    await ensureInstalled(page, nesSlug, nesTitle);
    evidence.gates.nesInstalled = true;
    await playFromDetails(page);
    evidence.gates.nesBootNoBios = true;
    const noBios = await assertNoDisksysInNesLaunch(page);
    evidence.gates.nesNoEjsBiosUrl = noBios;
    if (!noBios.ok) {
      throw new Error(`NES unexpectedly set EJS_biosUrl: ${JSON.stringify(noBios)}`);
    }

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowLeft');
    evidence.gates.nesInput = true;

    await quickSave(page);
    evidence.gates.nesSave = true;
    await page.keyboard.press('ArrowRight');
    await quickLoad(page);
    evidence.gates.nesLoad = true;
    await page.screenshot({
      path: join(shotDir, 'nes-regression-online.png'),
      fullPage: true,
    });

    // 2) Import FDS BIOS, switch to FDS, then back to NES
    await importOpenDiskSysRom(page);
    evidence.gates.fdsBiosImported = true;

    await ensureInstalled(page, fdsSlug, fdsTitle);
    await playFromDetails(page);
    evidence.gates.fdsBootWithBios = true;
    await page.keyboard.press('ArrowLeft');
    await quickSave(page);

    await ensureInstalled(page, nesSlug, nesTitle);
    await playFromDetails(page);
    evidence.gates.nesAfterFds = true;
    const stillNoBios = await assertNoDisksysInNesLaunch(page);
    evidence.gates.nesStillNoBiosAfterFds = stillNoBios;
    if (!stillNoBios.ok) {
      throw new Error(`NES required BIOS after FDS session: ${JSON.stringify(stillNoBios)}`);
    }
    await page.keyboard.press('ArrowRight');
    await quickSave(page);
    await quickLoad(page);

    // NES → FDS → NES → FDS
    for (const [slug, title, key] of [
      [fdsSlug, fdsTitle, 'fds2'],
      [nesSlug, nesTitle, 'nes2'],
      [fdsSlug, fdsTitle, 'fds3'],
    ]) {
      await ensureInstalled(page, slug, title);
      await playFromDetails(page);
      await page.keyboard.press('ArrowLeft');
      evidence.gates[`switch_${key}`] = true;
    }

    await context.close();
    context = undefined;

    // 3) Offline NES cold-start (no server)
    context = await launchPersistent(userDataDir);
    page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(300000);
    await context.setOffline(true);
    const net = trackAllNetwork(page);

    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    const card = page.locator('article.game-card', { hasText: nesTitle }).first();
    await card.waitFor({ timeout: 60000 });
    await card.getByRole('link', { name: /^▶ Play$/ }).click();
    await waitMenuEnabled(page);
    evidence.gates.nesOfflineBoot = true;
    await page.keyboard.press('ArrowLeft');
    await quickLoad(page);
    evidence.gates.nesOfflineLoad = true;
    net.assertNoServerDeps('NES offline cold-start');
    evidence.gates.nesOfflineNoServer = true;
    await page.screenshot({
      path: join(shotDir, 'nes-regression-offline.png'),
      fullPage: true,
    });

    console.log('NES_FCEUMM_REGRESSION_PASS');
    writeFileSync(resultsPath, JSON.stringify(evidence, null, 2));
    writeFileSync(
      join(evidenceDir, 'fds', 'checks-nes-fceumm-regression.txt'),
      ['NES_FCEUMM_REGRESSION_PASS', JSON.stringify(evidence.gates, null, 2)].join('\n'),
    );
  } catch (error) {
    writeFileSync(
      resultsPath,
      JSON.stringify({ error: String(error), stack: error.stack, evidence }, null, 2),
    );
    console.error('NES_FCEUMM_REGRESSION_FAIL', error);
    process.exitCode = 1;
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        /* ignore */
      }
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
})();
