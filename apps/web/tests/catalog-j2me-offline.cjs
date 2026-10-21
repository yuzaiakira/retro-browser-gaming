/**
 * Production catalog offline acceptance for MIT J2ME Dot / Paddle / Notes.
 * Uses Compose launcher (install → play → RMS → exit → stop origin services →
 * fresh Chromium process + persistent profile → offline relaunch → exact RMS).
 *
 * Usage:
 *   RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
 *     node apps/web/tests/catalog-j2me-offline.cjs
 */
const { chromium } = require('@playwright/test');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execSync } = require('node:child_process');
const { PNG } = require('pngjs');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-06');
const repoRoot = join(__dirname, '..', '..', '..');
const only = (process.env.CATALOG_J2ME_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const GAMES = [
  {
    slug: 'mit-j2me-dot',
    title: 'MIT J2ME Dot',
    key: 'dot',
    midletId: 'Retro Browser Gaming/MIT J2ME Dot/1.0.0',
    play: playDot,
    readState: (snap) => {
      const rec = snap?.stores?.dotScore?.records?.['1'];
      if (!rec || rec.length < 4) return null;
      const score =
        ((rec[0] & 0xff) << 24) |
        ((rec[1] & 0xff) << 16) |
        ((rec[2] & 0xff) << 8) |
        (rec[3] & 0xff);
      return score >= 1 ? { score } : null;
    },
    foreignStores: ['paddleHi', 'notesBody'],
  },
  {
    slug: 'mit-j2me-paddle',
    title: 'MIT J2ME Paddle',
    key: 'paddle',
    midletId: 'Retro Browser Gaming/MIT J2ME Paddle/1.0.0',
    play: playPaddle,
    readState: (snap) => {
      const rec = snap?.stores?.paddleHi?.records?.['1'];
      if (!rec || rec.length < 4) return null;
      const high =
        ((rec[0] & 0xff) << 24) |
        ((rec[1] & 0xff) << 16) |
        ((rec[2] & 0xff) << 8) |
        (rec[3] & 0xff);
      return high >= 1 ? { high } : null;
    },
    foreignStores: ['dotScore', 'notesBody'],
  },
  {
    slug: 'mit-j2me-notes',
    title: 'MIT J2ME Notes',
    key: 'notes',
    midletId: 'Retro Browser Gaming/MIT J2ME Notes/1.0.0',
    play: playNotes,
    readState: (snap) => {
      const rec = snap?.stores?.notesBody?.records?.['1'];
      if (!rec) return null;
      const note = String.fromCharCode(...rec);
      return note ? { note } : null;
    },
    foreignStores: ['dotScore', 'paddleHi'],
  },
].filter((g) => !only.length || only.includes(g.key));

function compose(cmd) {
  return execSync(`./scripts/compose.sh ${cmd}`, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitRunning(page, title) {
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 60000 });
  await page.getByText('Running locally · no server rendering', { exact: true }).waitFor({
    timeout: 180000,
  });
  await page.getByRole('button', { name: 'Pause' }).waitFor({ timeout: 30000 });
}

async function j2meFrame(page) {
  const frame = page.frames().find((f) => f.url().includes('/runtime/j2me-frame.html'));
  if (!frame) throw new Error('j2me frame missing');
  return frame;
}

async function rmsSnapshot(page) {
  const frame = await j2meFrame(page);
  return frame.evaluate(async () => {
    if (!window.J2meRmsIdb || !js2me?.rmsMidletId) return null;
    const rms = J2meRmsIdb.create();
    try {
      return await rms.load(js2me.rmsMidletId);
    } finally {
      await rms.close();
    }
  });
}

const KEY_BY_COMMAND = {
  0: { code: 'KeyZ', key: 'z' }, // B / fire
  4: { code: 'ArrowUp', key: 'ArrowUp' },
  5: { code: 'ArrowDown', key: 'ArrowDown' },
  6: { code: 'ArrowLeft', key: 'ArrowLeft' },
  7: { code: 'ArrowRight', key: 'ArrowRight' },
  8: { code: 'KeyX', key: 'x' }, // A / fire
};

async function sendInput(page, command, value) {
  const map = KEY_BY_COMMAND[command] || { code: 'Enter', key: 'Enter' };
  await page.evaluate(
    ({ code, key, value }) => {
      window.dispatchEvent(
        new KeyboardEvent(value ? 'keydown' : 'keyup', { code, key, bubbles: true }),
      );
    },
    { ...map, value },
  );
}

async function playDot(page) {
  await page.waitForTimeout(600);
  // FIRE increments score and persists RMS (not movement keys).
  for (let i = 0; i < 4; i++) {
    await sendInput(page, 0, 1);
    await page.waitForTimeout(50);
    await sendInput(page, 0, 0);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(800);
}

async function playPaddle(page) {
  await page.waitForTimeout(700);
  for (let round = 0; round < 80; round++) {
    await sendInput(page, 6, 1);
    await page.waitForTimeout(25);
    await sendInput(page, 6, 0);
    await sendInput(page, 7, 1);
    await page.waitForTimeout(25);
    await sendInput(page, 7, 0);
    await page.waitForTimeout(80);
    const snap = await rmsSnapshot(page);
    const hi = snap?.stores?.paddleHi?.records?.['1'];
    if (hi && hi.length >= 4) {
      const high =
        ((hi[0] & 0xff) << 24) | ((hi[1] & 0xff) << 16) | ((hi[2] & 0xff) << 8) | (hi[3] & 0xff);
      if (high >= 1) return;
    }
  }
  throw new Error('paddle: failed to score high>=1 via catalog player');
}

async function playNotes(page) {
  await page.waitForTimeout(600);
  const frame = await j2meFrame(page);
  const ok = await frame.evaluate(() => {
    const input = document.querySelector('#screen input');
    if (!input) return false;
    input.value = 'catalog-offline-note';
    return true;
  });
  if (!ok) throw new Error('notes input missing in catalog player');
  await frame.evaluate(() => {
    document.getElementById('choice')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
  await page.waitForTimeout(700);
}

async function installAndPlay(page, game) {
  console.log(`CATALOG_J2ME_NAV ${game.slug}`);
  await page.goto(`${baseUrl}/games/${game.slug}`);
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 30000 });
  const play = page.getByRole('link', { name: '▶ Play game' });
  if (await play.count()) {
    console.log(`CATALOG_J2ME_ALREADY_INSTALLED ${game.slug}`);
    await play.click();
  } else {
    console.log(`CATALOG_J2ME_DOWNLOAD_START ${game.slug}`);
    await page.getByRole('button', { name: 'Download & try on this device' }).click();
    await play.waitFor({ timeout: 600000 });
    console.log(`CATALOG_J2ME_DOWNLOAD_DONE ${game.slug}`);
    await play.click();
  }
  console.log(`CATALOG_J2ME_WAIT_RUNNING ${game.slug}`);
  await waitRunning(page, game.title);

  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  });
  if (!controlled) throw new Error(`${game.slug}: service worker not controlling`);

  await game.play(page);

  let state = null;
  for (let i = 0; i < 40; i++) {
    const snap = await rmsSnapshot(page);
    state = game.readState(snap);
    if (state != null) {
      for (const name of game.foreignStores) {
        if (snap?.stores?.[name]) {
          throw new Error(`${game.slug}: cross-suite store ${name} visible`);
        }
      }
      break;
    }
    await page.waitForTimeout(200);
  }
  if (state == null) throw new Error(`${game.slug}: no RMS state after play`);

  // Leave player (dispose) before offline reopen
  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 60000 });
  return state;
}

async function offlineRelaunch(page, game, expected) {
  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 60000 });
  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: game.title }) })
    .getByRole('link', { name: 'Play game' })
    .click();
  await waitRunning(page, game.title);

  let restored = null;
  for (let i = 0; i < 40; i++) {
    const snap = await rmsSnapshot(page);
    restored = game.readState(snap);
    if (restored != null && JSON.stringify(restored) === JSON.stringify(expected)) break;
    await page.waitForTimeout(200);
  }
  if (JSON.stringify(restored) !== JSON.stringify(expected)) {
    throw new Error(
      `${game.slug}: offline RMS mismatch expected=${JSON.stringify(expected)} got=${JSON.stringify(restored)}`,
    );
  }

  // Visual: frame not blank
  const shot = await (await j2meFrame(page)).locator('body').screenshot();
  const png = PNG.sync.read(shot);
  let lit = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 40) lit++;
  }
  if (lit < 20) throw new Error(`${game.slug}: offline frame too dark (${lit})`);

  await page.screenshot({
    path: join(evidenceDir, 'screenshots', `catalog-offline-j2me-${game.key}.png`),
    fullPage: true,
  });
  return restored;
}

async function run() {
  mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });
  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-j2me-catalog-'));
  const results = {};
  const saved = {};

  try {
    let context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    let page = context.pages()[0] || (await context.newPage());
    page.on('pageerror', (e) => console.error(`PAGEERROR ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') console.error(`CONSOLE ${m.text()}`);
    });

    for (const game of GAMES) {
      console.log(`CATALOG_J2ME_INSTALL_START ${game.key}`);
      saved[game.key] = await installAndPlay(page, game);
      console.log(`CATALOG_J2ME_INSTALL_PASS ${game.key} ${JSON.stringify(saved[game.key])}`);
      results[`${game.key}Install`] = true;
      results[`${game.key}State`] = saved[game.key];
    }
    await context.close();

    // Stop application origin network services (api + object-store + web).
    // Offline cold-start must use SW/OPFS only.
    console.log('CATALOG_J2ME_STOP_ORIGIN');
    compose('stop web api object-store');

    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    page = context.pages()[0] || (await context.newPage());
    page.on('pageerror', (e) => console.error(`PAGEERROR ${e.message}`));
    await context.setOffline(true);

    for (const game of GAMES) {
      console.log(`CATALOG_J2ME_OFFLINE_START ${game.key}`);
      const restored = await offlineRelaunch(page, game, saved[game.key]);
      console.log(`CATALOG_J2ME_OFFLINE_PASS ${game.key} ${JSON.stringify(restored)}`);
      results[`${game.key}Offline`] = true;
    }

    await context.close();
    writeFileSync(join(evidenceDir, 'catalog-j2me-offline-20261021.txt'), JSON.stringify(results, null, 2));
    console.log(`CATALOG_J2ME_OFFLINE_PASS ${JSON.stringify(results)}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
    try {
      compose('start object-store api web');
    } catch (e) {
      console.error('compose restart warning', e.message || e);
    }
  }
}

run().catch((error) => {
  console.error(error);
  try {
    compose('start object-store api web');
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
});
