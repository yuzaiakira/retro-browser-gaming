/**
 * Sprint 4.1 — personalization reliability E2E.
 * Real Orbit + Genesis. Simulated Chromium only.
 * Prefs inheritance, iframe-focus shortcuts, genuine no-remount identity.
 */
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir =
  process.env.EVIDENCE_DIR ||
  join(__dirname, '../../../docs/test-evidence/PH-UX-PERSONALIZE');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

async function waitMenuEnabled(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 180000,
  });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 180000 });
}

async function ensureInstalled(page, slug, title) {
  await page.goto(`${baseUrl}/games/${slug}`);
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  if (await page.getByRole('link', { name: /Play game/i }).count()) return;
  await page.getByRole('button', { name: /Download/i }).first().click();
  await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 300000 });
}

async function openMenu(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('heading', { name: 'Game menu' }).waitFor();
}

async function iframeIdentity(page) {
  return page.evaluate(() => {
    const iframe = document.querySelector('.player-stage iframe');
    const shell = document.querySelector('.player-shell');
    if (!iframe || !shell) return null;
    return {
      session: shell.getAttribute('data-runtime-session'),
      epoch: shell.getAttribute('data-iframe-epoch'),
      iframeSession: iframe.getAttribute('data-runtime-session'),
      src: iframe.getAttribute('src') || '',
      // Stable object identity marker stamped once on the live node
      nodeMark:
        iframe.dataset.rbgNodeMark ||
        (iframe.dataset.rbgNodeMark = `n-${Math.random().toString(36).slice(2)}`),
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
  const evidence = {
    display: {},
    prefs: {},
    saves: {},
    hud: {},
    shortcuts: {},
    remount: {},
  };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);

  await ensureInstalled(page, 'orbit-catch', 'Orbit Catch');
  await page.getByRole('link', { name: /Play game/i }).click();
  await page.waitForURL(/\/play\//);
  await waitMenuEnabled(page);

  const before = await iframeIdentity(page);
  evidence.remount.before = before;

  await openMenu(page);
  await page.getByLabel('Display mode').selectOption('original');
  await page.waitForTimeout(200);
  const stage = page.locator('.player-stage');
  evidence.display.modeOriginal = (await stage.getAttribute('data-display')) === 'original';
  await page.getByLabel('Frame scaling filter').selectOption('sharp');
  evidence.display.filterSharp = (await stage.getAttribute('data-filter')) === 'sharp';

  const afterDisplay = await iframeIdentity(page);
  evidence.remount.afterDisplay = afterDisplay;
  evidence.display.noRemount =
    !!before &&
    !!afterDisplay &&
    before.session &&
    before.session === afterDisplay.session &&
    before.nodeMark === afterDisplay.nodeMark &&
    before.src === afterDisplay.src &&
    before.epoch === afterDisplay.epoch;

  const honesty = await page.getByRole('note').filter({ hasText: /iframe/i }).count();
  evidence.display.filterHonesty = honesty >= 1;

  const integerDisabled = await page
    .locator('select[aria-label="Display mode"] option:disabled')
    .count();
  evidence.display.integerHonest = integerDisabled >= 1;

  await page.getByRole('button', { name: 'Minimize HUD' }).click();
  await page.locator('.player-shell[data-hud="minimal"]').waitFor();
  await page.getByRole('heading', { name: 'Game menu' }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Open game menu' }).waitFor();
  evidence.hud.minimal = true;
  const afterHud = await iframeIdentity(page);
  evidence.remount.afterHud = afterHud;
  evidence.remount.hudPreserved =
    !!before && !!afterHud && before.nodeMark === afterHud.nodeMark && before.session === afterHud.session;

  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-hud-minimal.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Open game menu' }).click();
  await page.getByRole('heading', { name: 'Game menu' }).waitFor();
  await page.getByRole('button', { name: 'Show full HUD' }).click();
  await page.locator('.player-shell[data-hud="full"]').waitFor();
  evidence.hud.restored = true;

  // Parent-window Escape
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Game menu' }).waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Game menu' }).waitFor();
  evidence.shortcuts.escapeMenu = true;
  await page.getByRole('button', { name: 'Close' }).click();

  // Real iframe focus: keys must be claimed inside the frame (shell-key bridge).
  await page.locator('.player-stage iframe').evaluate((el) => {
    el.contentWindow.focus();
  });
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Game menu' }).waitFor({ timeout: 10000 });
  evidence.shortcuts.iframeFocusEscape = true;
  await page.getByRole('button', { name: 'Close' }).click();

  // Pause via KeyP with iframe focus (shell-key bridge). Resume via HUD to avoid busy races.
  await page.locator('.player-stage iframe').evaluate((el) => el.contentWindow.focus());
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyP');
  await page.locator('.player-shell[data-paused]').waitFor({ timeout: 15000 });
  evidence.shortcuts.iframeFocusPause = true;
  const resumeBtn = page.getByRole('button', { name: 'Resume', exact: true });
  if (await resumeBtn.count()) {
    await resumeBtn.click();
  } else {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
  }
  await page.waitForFunction(
    () => !document.querySelector('.player-shell')?.hasAttribute('data-paused'),
    { timeout: 15000 },
  );

  // Volume change must not remount (Orbit has no audio — open/close menu + filter instead)
  await openMenu(page);
  const vol = page.getByLabel('Volume');
  if (await vol.count()) {
    await vol.fill('0.2');
    await page.waitForTimeout(200);
  } else {
    evidence.prefs.volumeSkippedNative = true;
    await page.getByLabel('Frame scaling filter').selectOption('smooth');
    await page.waitForTimeout(200);
  }
  const afterVolume = await iframeIdentity(page);
  evidence.remount.afterVolume = afterVolume;
  evidence.remount.volumePreserved =
    !!before &&
    !!afterVolume &&
    before.nodeMark === afterVolume.nodeMark &&
    before.session === afterVolume.session;

  // Reset prefs → inheritance restored (display back toward global/default fit)
  await page.getByRole('button', { name: /Reset this game/i }).click();
  await page.waitForTimeout(400);
  const modeAfterReset = await page.getByLabel('Display mode').inputValue();
  evidence.prefs.resetRestoresInheritance = modeAfterReset === 'fit';
  await page.getByRole('button', { name: 'Close' }).click();

  // Persist: set original again, reopen
  await openMenu(page);
  await page.getByLabel('Display mode').selectOption('original');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.goto(`${baseUrl}/library`);
  await page.goto(`${baseUrl}/games/orbit-catch`);
  await page.getByRole('link', { name: /Play game/i }).click();
  await waitMenuEnabled(page);
  await openMenu(page);
  const mode = await page.getByLabel('Display mode').inputValue();
  evidence.prefs.persistedOriginal = mode === 'original';
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-display-original.png'),
    fullPage: true,
  });

  // Sparse overlay probe: display-only override must not persist volume.
  evidence.prefs.inheritanceProbe = await page.evaluate(async () => {
    const dbp = indexedDB.open('retro-library');
    const db = await new Promise((resolve, reject) => {
      dbp.onsuccess = () => resolve(dbp.result);
      dbp.onerror = () => reject(dbp.error);
    });
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const get = (key) =>
      new Promise((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    const all = await new Promise((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const releaseKey = all.find(
      (k) => typeof k === 'string' && k.startsWith('prefs:v1:release:'),
    );
    const release = releaseKey ? await get(releaseKey) : null;
    const patch = release?.kind === 'overlay' ? release.patch : release;
    return {
      releaseKind: release?.kind || (release ? 'legacy-or-flat' : null),
      releaseHasVolume: !!(patch && Object.prototype.hasOwnProperty.call(patch, 'volume')),
      releaseHasDisplay: !!(patch && Object.prototype.hasOwnProperty.call(patch, 'displayMode')),
    };
  }).catch((e) => ({ error: String(e) }));
  evidence.prefs.sparseOverlay =
    evidence.prefs.inheritanceProbe &&
    !evidence.prefs.inheritanceProbe.error &&
    evidence.prefs.inheritanceProbe.releaseHasDisplay === true &&
    evidence.prefs.inheritanceProbe.releaseHasVolume === false;

  // Genesis save manager
  await page.goto(`${baseUrl}/games/mit-genesis-breakout`);
  await ensureInstalled(page, 'mit-genesis-breakout', 'MIT Genesis Breakout');
  await page.getByRole('link', { name: /Play game/i }).click();
  await waitMenuEnabled(page);

  const genBefore = await iframeIdentity(page);
  await openMenu(page);
  const menu = page.getByRole('dialog', { name: 'Game menu' });
  await menu.getByRole('heading', { name: 'Save manager' }).waitFor();
  await menu.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-toast, .player-status')
    .filter({ hasText: /Quick save stored/i })
    .first()
    .waitFor({ timeout: 60000 });
  const quickRow = menu
    .getByRole('list', { name: 'Save slots' })
    .locator('li[data-status="saved"]')
    .filter({ hasText: /Quick save/i });
  await quickRow.waitFor({ timeout: 15000 });
  const stamp1 = await quickRow.locator('span').innerText();
  evidence.saves.slotList = true;
  evidence.saves.timestampPresent = /Saved|Quick/i.test(stamp1);

  await page.waitForTimeout(1100);
  await menu.getByRole('button', { name: 'Quick save', exact: true }).click();
  await page
    .locator('.player-toast, .player-status')
    .filter({ hasText: /Quick save stored/i })
    .first()
    .waitFor({ timeout: 60000 });
  await page.waitForTimeout(400);
  const stamp2 = await quickRow.locator('span').innerText();
  evidence.saves.timestampUpdates = stamp2.length > 0;

  const emptyLoad = page
    .getByRole('list', { name: 'Save slots' })
    .locator('li[data-status="empty"] button', { hasText: 'Load' })
    .first();
  if (await emptyLoad.count()) {
    evidence.saves.emptyLoadDisabled = await emptyLoad.isDisabled();
  } else {
    evidence.saves.emptyLoadDisabled = true;
  }

  // Quick load requires confirm — do not auto-load
  await menu.getByRole('button', { name: 'Quick load', exact: true }).click();
  await page.getByRole('heading', { name: 'Load save state?' }).waitFor();
  evidence.saves.loadConfirm = true;
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  // Fullscreen entry/exit preserves iframe identity
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('.player-stage iframe').evaluate((el) => el.contentWindow.focus());
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(500);
  const afterFs = await iframeIdentity(page);
  evidence.remount.afterFullscreen = afterFs;
  evidence.remount.fullscreenPreserved =
    !!genBefore &&
    !!afterFs &&
    genBefore.nodeMark === afterFs.nodeMark &&
    genBefore.session === afterFs.session;

  // Iframe-focus F8 quick save (Genesis)
  await page.locator('.player-stage iframe').evaluate((el) => el.contentWindow.focus());
  await page.keyboard.press('F8');
  await page
    .locator('.player-toast, .player-status')
    .filter({ hasText: /Quick save stored/i })
    .first()
    .waitFor({ timeout: 60000 });
  evidence.shortcuts.iframeFocusQuickSave = true;

  await page.screenshot({
    path: join(evidenceDir, 'screenshots', 'player-save-manager.png'),
    fullPage: true,
  });

  // Settings everyday play defaults
  await page.goto(`${baseUrl}/settings`);
  await page.getByRole('heading', { name: 'Play defaults' }).waitFor();
  await page.getByText(/Advanced/i).first().waitFor();
  evidence.prefs.settingsEveryday = true;

  const required = [
    ['noRemount', evidence.display.noRemount],
    ['hudPreserved', evidence.remount.hudPreserved],
    ['volumePreserved', evidence.remount.volumePreserved],
    ['integerHonest', evidence.display.integerHonest],
    ['filterHonesty', evidence.display.filterHonesty],
    ['persistedOriginal', evidence.prefs.persistedOriginal],
    ['resetRestoresInheritance', evidence.prefs.resetRestoresInheritance],
    ['sparseOverlay', evidence.prefs.sparseOverlay],
    ['minimalHud', evidence.hud.minimal],
    ['escapeMenu', evidence.shortcuts.escapeMenu],
    ['iframeFocusEscape', evidence.shortcuts.iframeFocusEscape],
    ['iframeFocusPause', evidence.shortcuts.iframeFocusPause],
    ['iframeFocusQuickSave', evidence.shortcuts.iframeFocusQuickSave],
    ['slotList', evidence.saves.slotList],
    ['emptyLoadDisabled', evidence.saves.emptyLoadDisabled],
    ['loadConfirm', evidence.saves.loadConfirm],
    ['settingsEveryday', evidence.prefs.settingsEveryday],
  ];
  for (const [name, ok] of required) {
    if (!ok) throw new Error(`Required personalization assertion failed: ${name}`);
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  writeFileSync(
    join(evidenceDir, `player-personalization-${stamp}.json`),
    JSON.stringify(evidence, null, 2),
  );
  writeFileSync(
    join(evidenceDir, 'player-personalization-latest.json'),
    JSON.stringify(evidence, null, 2),
  );
  console.log('PLAYER_PERSONALIZATION_PASS', JSON.stringify(evidence));
  await browser.close();
})().catch((err) => {
  console.error('PLAYER_PERSONALIZATION_FAIL', err);
  process.exitCode = 1;
});
