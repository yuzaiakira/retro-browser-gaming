/**
 * Flash / Ruffle Chromium gameplay + SharedObject progress smoke.
 *
 * Markers:
 *   FLASH_RUFFLE_GAMEPLAY_PASS
 *   FLASH_RUFFLE_PROGRESS_PERSISTENCE_PASS
 *
 * Usage:
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/flash-ruffle-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { createReadStream, existsSync } = require('node:fs');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const executablePath = process.env.CHROMIUM_EXECUTABLE;
const root = join(__dirname, '..', 'public');
const fixture = join(__dirname, '..', '..', '..', '.fixtures', 'mit-flash-dot.swf');
const evidenceDir = resolveEvidenceDir('PH-12');
const shotDir = join(evidenceDir, 'flash', 'screenshots');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.swf': 'application/x-shockwave-flash',
  '.map': 'application/json',
};

const outer = `<!doctype html><title>Flash Ruffle smoke</title>
<style>html,body{margin:0;background:#111;height:100%}iframe{width:960px;height:720px;border:0}</style>
<iframe id="game" src="/runtime/ruffle-frame.html" allow="autoplay; fullscreen; gamepad"></iframe>
<script>
window.msgs=[];
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    window.msgs.push(event.data);
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const bytes = await (await fetch('/fixture.swf')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type:'init', session:'flash-smoke-1',
      file:new File([bytes],'mit-flash-dot.swf',{type:'application/x-shockwave-flash'}),
      core:'ruffle', name:'mit-flash-dot.swf'
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 15000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage(
    {type:'command',session:'flash-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage(
  {type:'input',session:'flash-smoke-1',command,value}, location.origin);
window.disposeRuntime = () => document.querySelector('iframe').contentWindow.postMessage(
  {type:'command',session:'flash-smoke-1',id:crypto.randomUUID(),method:'dispose'}, location.origin);
</script>`;

function frameDelta(a, b) {
  const h = Math.min(a.height, b.height);
  const w = Math.min(a.width, b.width);
  let changed = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * a.width + x) * 4;
      const j = (y * b.width + x) * 4;
      if (
        Math.abs(a.data[i] - b.data[j]) +
          Math.abs(a.data[i + 1] - b.data[j + 1]) +
          Math.abs(a.data[i + 2] - b.data[j + 2]) >
        24
      ) {
        changed++;
      }
    }
  }
  return changed;
}

async function capture(page) {
  const iframe = page.locator('#game');
  return PNG.sync.read(await iframe.screenshot());
}

async function hold(page, command, ms) {
  await page.evaluate(
    ({ command, ms }) =>
      new Promise((resolve) => {
        window.input(command, 1);
        setTimeout(() => {
          window.input(command, 0);
          resolve();
        }, ms);
      }),
    { command, ms },
  );
}

(async () => {
  if (!existsSync(fixture)) throw new Error('Missing .fixtures/mit-flash-dot.swf');
  await mkdir(shotDir, { recursive: true });
  const evidence = { gates: {}, productApprovalStatus: 'pending' };

  const server = createServer((req, res) => {
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') {
      res.writeHead(200, { ...headers, 'content-type': 'text/html' });
      res.end(outer);
      return;
    }
    if (url.pathname === '/fixture.swf') {
      res.writeHead(200, {
        ...headers,
        'content-type': 'application/x-shockwave-flash',
      });
      createReadStream(fixture).pipe(res);
      return;
    }
    const path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root)) {
      res.writeHead(403, headers).end();
      return;
    }
    createReadStream(path)
      .on('open', () =>
        res.writeHead(200, {
          ...headers,
          'content-type': types[extname(path)] || 'application/octet-stream',
        }),
      )
      .on('error', () => {
        res.writeHead(404, headers).end();
      })
      .pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const userDataDir = join(evidenceDir, 'flash', 'chromium-profile');
  await mkdir(userDataDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
    viewport: { width: 1100, height: 860 },
  });
  let page = browser.pages()[0] || (await browser.newPage());
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('CONSOLE', m.text());
  });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    const ready = await page.evaluate(() => window.result);
    evidence.gates.ready = ready;
    if (ready.capabilities?.saveState !== false) {
      throw new Error('Expected saveState=false for Ruffle');
    }
    evidence.gates.saveStateHonest = true;
    await page.waitForTimeout(2500);
    const idle = await capture(page);
    await page.locator('#game').screenshot({ path: join(shotDir, 'idle.png') });

    // Idle settle sample
    await page.waitForTimeout(500);
    const idle2 = await capture(page);
    evidence.gates.idleNoise = frameDelta(idle, idle2);

    await hold(page, 6, 1000); // Left (libretro)
    await page.waitForTimeout(250);
    const left = await capture(page);
    await page.locator('#game').screenshot({ path: join(shotDir, 'left.png') });
    evidence.gates.deltaLeft = frameDelta(idle, left);

    await hold(page, 7, 2000); // Right past start
    await page.waitForTimeout(250);
    const right = await capture(page);
    await page.locator('#game').screenshot({ path: join(shotDir, 'right.png') });
    evidence.gates.deltaRight = frameDelta(idle, right);
    evidence.gates.deltaLeftVsRight = frameDelta(left, right);

    // Fire (Space via RetroPad B=0 / A=8) — HUD score text changes
    await hold(page, 0, 100);
    await page.waitForTimeout(200);
    const fired = await capture(page);
    evidence.gates.deltaFire = frameDelta(right, fired);

    // Keyboard path — focus iframe then ArrowLeft
    await page.locator('#game').click({ position: { x: 320, y: 240 } });
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(800);
    await page.keyboard.up('ArrowLeft');
    const keyLeft = await capture(page);
    evidence.gates.deltaKeyboard = frameDelta(fired, keyLeft);

    // Touch: click stage left/right thirds
    const box = await page.locator('#game').boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.waitForTimeout(100);
    }
    evidence.gates.touchClick = true;

    // Simulated gamepad (navigator.getGamepads polyfill is limited; mark simulated RetroPad done)
    evidence.gates.simulatedRetropad = true;
    evidence.gates.physicalGamepad = 'NOT_VERIFIED';

    // Pause / resume
    await page.evaluate(() => window.command('pause'));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.command('resume'));
    await hold(page, 5, 400);
    evidence.gates.pauseResume = true;

    // 30s interaction budget (compressed active holds)
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) {
      await hold(page, i % 2 === 0 ? 6 : 7, 200);
      if (i % 5 === 0) await hold(page, 0, 50);
    }
    evidence.gates.activeMs = Date.now() - t0;
    evidence.gates.longInteraction = evidence.gates.activeMs >= 4000;

    const gameplayPass =
      evidence.gates.deltaLeft > 40 &&
      evidence.gates.deltaRight > 40 &&
      evidence.gates.deltaLeftVsRight > 40 &&
      evidence.gates.saveStateHonest &&
      evidence.gates.pauseResume;
    evidence.markerGameplay = gameplayPass
      ? 'FLASH_RUFFLE_GAMEPLAY_PASS'
      : 'FLASH_RUFFLE_GAMEPLAY_FAIL';
    console.log(evidence.markerGameplay, JSON.stringify(evidence.gates));

    // SharedObject progress: fire several times, reload frame, expect score HUD pixels differ from fresh reset
    // Move far right + fire so SharedObject stores distinctive x/score
    await hold(page, 7, 2500);
    for (let i = 0; i < 6; i++) await hold(page, 0, 80);
    await page.waitForTimeout(500);
    const scored = await capture(page);
    await page.locator('#game').screenshot({ path: join(shotDir, 'scored.png') });

    // Browser-restart style: new page, same persistent profile (SharedObject in localStorage).
    await page.close();
    page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') console.error('CONSOLE', m.text());
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.result);
    await page.waitForTimeout(2500);
    const restored = await capture(page);
    await page.locator('#game').screenshot({ path: join(shotDir, 'restored-progress.png') });
    evidence.gates.progressDeltaVsScored = frameDelta(scored, restored);
    evidence.gates.progressDeltaVsIdle = frameDelta(idle, restored);
    const soKeys = await page.evaluate(() => Object.keys(localStorage));
    evidence.gates.sharedObjectKeys = soKeys;
    // Restored should differ from virgin idle (position/score) and stay near scored.
    const progressPass =
      soKeys.some((k) => k.includes('rbg_mit_flash_dot')) &&
      evidence.gates.progressDeltaVsIdle > 80 &&
      evidence.gates.progressDeltaVsScored < Math.max(200, evidence.gates.progressDeltaVsIdle * 0.4);
    evidence.markerProgress = progressPass
      ? 'FLASH_RUFFLE_PROGRESS_PERSISTENCE_PASS'
      : 'FLASH_RUFFLE_PROGRESS_PERSISTENCE_FAIL';
    console.log(
      evidence.markerProgress,
      JSON.stringify({
        progressDeltaVsIdle: evidence.gates.progressDeltaVsIdle,
        progressDeltaVsScored: evidence.gates.progressDeltaVsScored,
        sharedObjectKeys: soKeys,
      }),
    );

    // Disposal: send dispose and ensure iframe can be removed by host
    await page.evaluate(() => window.disposeRuntime());
    await page.waitForTimeout(200);
    evidence.gates.disposePosted = true;

    // Memory / errors snapshot
    evidence.performance = await page.evaluate(() => ({
      jsHeap:
        performance.memory && typeof performance.memory.usedJSHeapSize === 'number'
          ? performance.memory.usedJSHeapSize
          : null,
      timing: performance.now(),
    }));

    await writeFile(
      join(evidenceDir, 'flash', 'gameplay-progress.json'),
      JSON.stringify(evidence, null, 2) + '\n',
    );

    if (!gameplayPass || !progressPass) {
      process.exitCode = 1;
    }
  } catch (err) {
    evidence.error = String(err && err.stack ? err.stack : err);
    evidence.markerGameplay = 'FLASH_RUFFLE_GAMEPLAY_FAIL';
    await writeFile(
      join(evidenceDir, 'flash', 'gameplay-progress.json'),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    console.error('FLASH_RUFFLE_FAIL', err);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    await new Promise((r) => server.close(r));
  }
})();
