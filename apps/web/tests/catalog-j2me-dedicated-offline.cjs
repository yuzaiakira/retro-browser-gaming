/**
 * Authentic dedicated-origin J2ME catalog offline gate.
 *
 * Uses Compose edge (launcher.localhost + j2me.localhost). After install,
 * stops edge/web/api/object-store and relaunches Chromium with ONLY the
 * persistent profile — no Playwright route.fulfill, no mock asset server.
 *
 * Requires: NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=true baked into the web image,
 * edge published on RETRO_EDGE_PORT (default 13000).
 *
 * Usage:
 *   RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
 *   RETRO_J2ME_ORIGIN=http://j2me.localhost:13000 \
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium \
 *   node apps/web/tests/catalog-j2me-dedicated-offline.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execSync } = require('node:child_process');
const { PNG } = require('pngjs');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const j2meOrigin = process.env.RETRO_J2ME_ORIGIN || 'http://j2me.localhost:13000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-06');
const repoRoot = join(__dirname, '..', '..', '..');

const GAMES = [
  {
    slug: 'mit-j2me-dot',
    title: 'MIT J2ME Dot',
    key: 'dot',
    play: playDot,
    readState: (snap) => {
      const rec = snap?.stores?.dotScore?.records?.['1'];
      if (!rec || rec.length < 4) return null;
      const score = (rec[0] << 24) | (rec[1] << 16) | (rec[2] << 8) | rec[3];
      return score >= 1 ? { score } : null;
    },
  },
  {
    slug: 'mit-j2me-paddle',
    title: 'MIT J2ME Paddle',
    key: 'paddle',
    play: playPaddle,
    readState: (snap) => {
      const rec = snap?.stores?.paddleHi?.records?.['1'];
      if (!rec || rec.length < 4) return null;
      const high = (rec[0] << 24) | (rec[1] << 16) | (rec[2] << 8) | rec[3];
      return high >= 1 ? { high } : null;
    },
  },
  {
    slug: 'mit-j2me-notes',
    title: 'MIT J2ME Notes',
    key: 'notes',
    play: playNotes,
    readState: (snap) => {
      const rec = snap?.stores?.notesBody?.records?.['1'];
      if (!rec) return null;
      return { note: String.fromCharCode(...rec) };
    },
  },
];

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
    timeout: 240000,
  });
}

async function j2meFrame(page) {
  const frame = page.frames().find((f) => f.url().startsWith(j2meOrigin));
  if (!frame) throw new Error(`j2me dedicated frame missing (want ${j2meOrigin})`);
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

async function playDot(page) {
  await page.waitForTimeout(700);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down('z');
    await page.waitForTimeout(40);
    await page.keyboard.up('z');
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(800);
}

async function playPaddle(page) {
  await page.waitForTimeout(700);
  for (let round = 0; round < 80; round++) {
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(25);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(25);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(80);
    const snap = await rmsSnapshot(page);
    const hi = snap?.stores?.paddleHi?.records?.['1'];
    if (hi && ((hi[0] << 24) | (hi[1] << 16) | (hi[2] << 8) | hi[3]) >= 1) return;
  }
  throw new Error('paddle: no high score');
}

async function playNotes(page) {
  await page.waitForTimeout(600);
  const frame = await j2meFrame(page);
  const ok = await frame.evaluate(() => {
    const input = document.querySelector('#screen input');
    if (!input) return false;
    input.value = 'dedicated-offline-note';
    return true;
  });
  if (!ok) throw new Error('notes input missing');
  await frame.evaluate(() => {
    document.getElementById('choice')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
  await page.waitForTimeout(700);
}

async function assertOriginsLive() {
  for (const url of [baseUrl, j2meOrigin + '/j2me-install.html']) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`origin not live: ${url} → ${res.status}`);
  }
}

async function assertOriginsDown() {
  for (const url of [baseUrl, j2meOrigin + '/j2me-install.html']) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(1500) });
      throw new Error(`origin still reachable: ${url}`);
    } catch (e) {
      if (String(e.message || e).includes('still reachable')) throw e;
      // expected network failure
    }
  }
}

async function installAndPlay(page, game) {
  await page.goto(`${baseUrl}/games/${game.slug}`);
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 30000 });
  const play = page.getByRole('link', { name: '▶ Play game' });
  if (await play.count()) {
    await play.click();
  } else {
    await page.getByRole('button', { name: 'Download & try on this device' }).click();
    await play.waitFor({ timeout: 600000 });
    await play.click();
  }
  await waitRunning(page, game.title);

  const frame = await j2meFrame(page);
  const frameUrl = frame.url();
  if (!frameUrl.startsWith(j2meOrigin)) {
    throw new Error(`expected dedicated origin frame, got ${frameUrl}`);
  }

  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  });
  if (!controlled) throw new Error(`${game.slug}: launcher SW not controlling`);

  const j2meSw = await frame.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/');
    return {
      controlled: !!navigator.serviceWorker.controller,
      scope: reg?.scope || null,
    };
  });
  if (!j2meSw.controlled) {
    throw new Error(`${game.slug}: j2me SW not controlling frame (${JSON.stringify(j2meSw)})`);
  }

  // Isolation probe inside dedicated frame
  const iso = await frame.evaluate(async () => {
    let parentDom = null;
    try {
      parentDom = parent.document?.title || 'reachable';
    } catch (e) {
      parentDom = `blocked:${e.name}`;
    }
    return {
      origin: location.origin,
      parentDom,
      cookie: document.cookie || '',
    };
  });
  if (!String(iso.parentDom).startsWith('blocked:')) {
    throw new Error(`${game.slug}: parent DOM reachable ${iso.parentDom}`);
  }
  if (String(iso.cookie).includes('session') || String(iso.cookie).includes('auth')) {
    throw new Error(`${game.slug}: suspicious cookies in j2me origin`);
  }

  await game.play(page);
  let state = null;
  for (let i = 0; i < 40; i++) {
    state = game.readState(await rmsSnapshot(page));
    if (state != null) break;
    await page.waitForTimeout(200);
  }
  if (state == null) throw new Error(`${game.slug}: no RMS after play`);

  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: game.title }).waitFor({ timeout: 60000 });
  return { state, j2meSw, iso };
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
  const frame = await j2meFrame(page);
  if (!frame.url().startsWith(j2meOrigin)) {
    throw new Error(`offline frame not on dedicated origin: ${frame.url()}`);
  }
  let restored = null;
  for (let i = 0; i < 40; i++) {
    restored = game.readState(await rmsSnapshot(page));
    if (restored != null && JSON.stringify(restored) === JSON.stringify(expected)) break;
    await page.waitForTimeout(200);
  }
  if (JSON.stringify(restored) !== JSON.stringify(expected)) {
    throw new Error(
      `${game.slug}: offline RMS mismatch expected=${JSON.stringify(expected)} got=${JSON.stringify(restored)}`,
    );
  }
  const shot = await frame.locator('body').screenshot();
  const png = PNG.sync.read(shot);
  let lit = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 40) lit++;
  }
  if (lit < 20) throw new Error(`${game.slug}: offline frame dark (${lit})`);
  await page.screenshot({
    path: join(evidenceDir, 'screenshots', `catalog-dedicated-offline-j2me-${game.key}.png`),
    fullPage: true,
  });
  return restored;
}

async function run() {
  mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });
  await assertOriginsLive();

  const userDataDir = mkdtempSync(join(tmpdir(), 'retro-j2me-dedicated-'));
  const results = { mockedAssets: false, routeFulfill: false };
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
      console.log(`DEDICATED_INSTALL_START ${game.key}`);
      const out = await installAndPlay(page, game);
      saved[game.key] = out.state;
      results[`${game.key}Install`] = true;
      results[`${game.key}State`] = out.state;
      results[`${game.key}J2meSw`] = out.j2meSw;
      results[`${game.key}Isolation`] = out.iso;
      console.log(`DEDICATED_INSTALL_PASS ${game.key} ${JSON.stringify(out.state)}`);
    }
    await context.close();

    console.log('DEDICATED_STOP_ALL_ORIGIN_SERVICES');
    compose('stop edge web api object-store');
    await assertOriginsDown();
    results.originServicesStopped = true;

    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 1280, height: 900 },
    });
    // CRITICAL: do not install routes, do not setOffline mock servers — SW only.
    page = context.pages()[0] || (await context.newPage());
    page.on('pageerror', (e) => console.error(`PAGEERROR ${e.message}`));

    for (const game of GAMES) {
      console.log(`DEDICATED_OFFLINE_START ${game.key}`);
      const restored = await offlineRelaunch(page, game, saved[game.key]);
      results[`${game.key}Offline`] = true;
      console.log(`DEDICATED_OFFLINE_PASS ${game.key} ${JSON.stringify(restored)}`);
    }

    await context.close();
    writeFileSync(
      join(evidenceDir, 'catalog-j2me-dedicated-offline-20261021.txt'),
      JSON.stringify(results, null, 2),
    );
    console.log(`DEDICATED_J2ME_OFFLINE_PASS ${JSON.stringify(results)}`);
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
    try {
      compose('start object-store api web edge');
    } catch (e) {
      console.error('compose restart warning', e.message || e);
    }
  }
}

run().catch((error) => {
  console.error(error);
  try {
    compose('start object-store api web edge');
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
});
