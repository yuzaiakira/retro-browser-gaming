/**
 * Genuine Android offline cold-start: remove ADB reverse so the phone cannot
 * reach the host Compose stack, then reload/reopen the PWA library.
 * Restores reverse when finished. Does not log unrelated Chrome tabs.
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { execSync } = require('node:child_process');
const { writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const cdpUrl = process.env.ANDROID_CDP_URL || 'http://127.0.0.1:9222';
const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:13000';
const evidenceDir = resolveEvidenceDir('PH-08');

function adb(args) {
  return execSync(`adb ${args}`, { encoding: 'utf8' }).trim();
}

function deviceSerial() {
  const out = adb('devices');
  const line = out
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .find((l) => /\sdevice(\s|$)/.test(l) || l.endsWith('device'));
  if (!line) throw new Error('No adb device');
  return line.split(/\s+/)[0];
}

async function pickRewindPage(browser) {
  const pages = browser.contexts().flatMap((c) => c.pages());
  const rewind = pages.filter((p) => {
    try {
      return p.url().startsWith(baseUrl);
    } catch {
      return false;
    }
  });
  const library = rewind.find((p) => /\/library/.test(p.url()));
  if (library) return library;
  if (rewind[0]) return rewind[0];
  const context = browser.contexts()[0] || (await browser.newContext());
  return context.newPage();
}

async function readInstallState(page) {
  return page.evaluate(async () => {
    let installations = [];
    let library = [];
    try {
      const dbp = indexedDB.open('retro-library');
      const db = await new Promise((res, rej) => {
        dbp.onerror = () => rej(dbp.error);
        dbp.onsuccess = () => res(dbp.result);
      });
      if (db.objectStoreNames.contains('installations')) {
        installations = await new Promise((res) => {
          const tx = db.transaction('installations');
          const req = tx.objectStore('installations').getAll();
          tx.oncomplete = () => res(req.result || []);
        });
      }
      if (db.objectStoreNames.contains('library')) {
        library = await new Promise((res) => {
          const tx = db.transaction('library');
          const req = tx.objectStore('library').getAll();
          tx.oncomplete = () => res(req.result || []);
        });
      }
      db.close();
    } catch (e) {
      return { error: String(e) };
    }
    let sw = null;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      sw = { active: !!reg?.active, scope: reg?.scope || null };
    } catch (e) {
      sw = { error: String(e) };
    }
    return {
      href: location.href,
      online: navigator.onLine,
      bodySnippet: (document.body?.innerText || '').slice(0, 500),
      installationCount: installations.length,
      libraryCount: library.length,
      installationIds: installations.map((g) => g.id || g.gameId || g.slug).slice(0, 12),
      serviceWorker: sw,
    };
  });
}

async function run() {
  mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });
  const serial = deviceSerial();
  const results = {
    platform: 'Android Chrome over CDP',
    baseUrl,
    note: 'Offline proven by removing ADB reverse (not by disabling mobile data alone)',
    steps: [],
  };

  adb(`-s ${serial} reverse tcp:13000 tcp:13000`);
  adb(`-s ${serial} reverse tcp:18000 tcp:18000`);
  results.steps.push({ step: 'reverse-on', list: adb(`-s ${serial} reverse --list`) });

  const browser = await chromium.connectOverCDP(cdpUrl);
  try {
    let page = await pickRewindPage(browser);
    page.setDefaultTimeout(45000);

    // Online baseline: reload if already on library, else navigate
    if (!/\/library/.test(page.url())) {
      await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } else {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    }
    const onlineState = await readInstallState(page);
    results.onlineLibrary = onlineState;
    results.steps.push({
      step: 'online-library',
      installationCount: onlineState.installationCount,
      libraryCount: onlineState.libraryCount,
      sw: onlineState.serviceWorker,
    });
    if (!(onlineState.installationCount > 0 || onlineState.libraryCount > 0)) {
      throw new Error(`No local installs before offline cut: ${JSON.stringify(onlineState)}`);
    }

    // Cut USB reverse — phone cannot reach Compose host ports
    try {
      adb(`-s ${serial} reverse --remove tcp:13000`);
    } catch {
      /* ignore */
    }
    try {
      adb(`-s ${serial} reverse --remove tcp:18000`);
    } catch {
      /* ignore */
    }
    const listAfter = adb(`-s ${serial} reverse --list`);
    results.steps.push({ step: 'reverse-removed', list: listAfter || '(empty)' });
    if (/tcp:13000/.test(listAfter)) {
      throw new Error('reverse tcp:13000 still present after remove');
    }

    // Prove Compose host is unreachable: Django API (:18000) must fail.
    // Origin paths may still return 200 via Service Worker (expected offline shell).
    const fetchProbe = await page.evaluate(async () => {
      const probes = [];
      for (const url of [
        'http://127.0.0.1:18000/api/v1/health/',
        'http://127.0.0.1:18000/api/v1/games/?limit=1',
      ]) {
        try {
          const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
          probes.push({ url, ok: res.ok, status: res.status });
        } catch (e) {
          probes.push({ url, ok: false, error: String(e) });
        }
      }
      // SW-handled shell probe (may succeed offline — document, do not require failure)
      try {
        const res = await fetch('http://127.0.0.1:13000/library', { cache: 'no-store' });
        probes.push({ url: 'http://127.0.0.1:13000/library', ok: res.ok, status: res.status, via: 'likely-sw' });
      } catch (e) {
        probes.push({ url: 'http://127.0.0.1:13000/library', ok: false, error: String(e) });
      }
      return probes;
    });
    results.hostFetchAfterCut = fetchProbe;
    const apiUnreachable = fetchProbe
      .filter((p) => String(p.url).includes(':18000'))
      .every((p) => p.ok === false);
    results.apiUnreachable = apiUnreachable;
    results.hostUnreachable = apiUnreachable;

    // Reload library — shell from SW / cache; installs from IDB/OPFS
    let reloadError = null;
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
      reloadError = String(e.message || e);
      results.libraryReloadError = reloadError;
    }
    await page.waitForTimeout(1500);

    // Tab cold-open: new page to library while reverse still removed (no force-stop of Chrome)
    let coldPage = page;
    try {
      const ctx = browser.contexts()[0];
      coldPage = await ctx.newPage();
      await coldPage.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      results.steps.push({ step: 'cold-tab-open', href: coldPage.url() });
    } catch (e) {
      results.coldTabError = String(e.message || e);
      coldPage = page;
    }

    const offlineState = await readInstallState(coldPage).catch((e) => ({ error: String(e) }));
    results.offlineLibrary = offlineState;
    // Prefer cold page for remaining checks
    page = coldPage;

    await page
      .screenshot({
        path: join(evidenceDir, 'screenshots', 'android-offline-library.png'),
        timeout: 20000,
      })
      .catch((e) => console.warn('offline screenshot skipped', e.message));

    const installsRetained =
      (offlineState.installationCount || 0) > 0 || (offlineState.libraryCount || 0) > 0;
    const readyOfflineUi = /READY OFFLINE/i.test(offlineState.bodySnippet || '');
    const shellAlive =
      !offlineState.error &&
      (readyOfflineUi ||
        /library|offline|installed|orbit|genesis|play/i.test(offlineState.bodySnippet || '') ||
        /\/library/.test(offlineState.href || ''));

    // Optional: launch Orbit while reverse is still down
    let offlinePlay = null;
    if (apiUnreachable && installsRetained) {
      try {
        const play = page.getByRole('link', { name: /Play game/i }).first();
        if (await play.count()) {
          await play.click();
          await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 120000 });
          offlinePlay = { ok: true, href: page.url() };
          await page
            .screenshot({
              path: join(evidenceDir, 'screenshots', 'android-offline-play.png'),
              timeout: 15000,
            })
            .catch(() => {});
        }
      } catch (e) {
        offlinePlay = { ok: false, error: String(e.message || e) };
      }
    }
    results.offlinePlay = offlinePlay;

    results.genuineOffline = !!(
      apiUnreachable &&
      installsRetained &&
      shellAlive &&
      results.steps.some((s) => s.step === 'reverse-removed' && !/tcp:13000/.test(s.list || ''))
    );
    if (results.genuineOffline) console.log('ANDROID_OFFLINE_COLD_PASS');
    else console.log(`ANDROID_OFFLINE_COLD_PARTIAL ${JSON.stringify(results)}`);

    writeFileSync(join(evidenceDir, 'android-offline-cold-20261020.txt'), JSON.stringify(results, null, 2));
  } finally {
    try {
      adb(`-s ${serial} reverse tcp:13000 tcp:13000`);
      adb(`-s ${serial} reverse tcp:18000 tcp:18000`);
      results.steps.push({ step: 'reverse-restored', list: adb(`-s ${serial} reverse --list`) });
    } catch (e) {
      console.error('Failed to restore reverse', e);
    }
    await browser.close().catch(() => {});
    writeFileSync(join(evidenceDir, 'android-offline-cold-20261020.txt'), JSON.stringify(results, null, 2));
    console.log(
      `ANDROID_OFFLINE_DONE ${JSON.stringify({
        genuineOffline: results.genuineOffline,
        hostUnreachable: results.hostUnreachable,
        installationCount: results.offlineLibrary?.installationCount,
        libraryCount: results.offlineLibrary?.libraryCount,
      })}`,
    );
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
