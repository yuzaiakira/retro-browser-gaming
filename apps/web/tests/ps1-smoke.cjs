/**
 * PS1 real-core smoke: pcsx_rearmed + first-party MIT Dot CUE/BIN.
 * Bounded phases, query-safe static serving, structured TIMEOUT diagnostics.
 *
 * Usage:
 *   CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/ps1-smoke.cjs
 *
 * Env:
 *   PS1_READY_MS (default 180000) — wait for frame ready
 *   PS1_OVERALL_MS (default 420000) — hard overall deadline
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { mkdir, readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixtures = join(__dirname, '..', '..', '..', '.fixtures');
const evidenceDir = resolveEvidenceDir('PH-05');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const READY_MS = Number(process.env.PS1_READY_MS || 180000);
const OVERALL_MS = Number(process.env.PS1_OVERALL_MS || 420000);
const cueName = 'mit-ps1-dot.cue';
const companions = ['dot_track01.bin', 'dot_track02.bin'];
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.cue': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

const diagnostics = {
  phase: 'boot',
  notFound: [],
  requestFailed: [],
  consoleErrors: [],
  pageErrors: [],
};

function pathnameOf(url) {
  return (url || '/').split('?')[0];
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
  ]);
}

function dumpDiagnostics(error) {
  const unique404 = [...new Set(diagnostics.notFound)];
  console.error(
    `PS1_DIAG ${JSON.stringify({
      phase: diagnostics.phase,
      error: String(error?.message || error),
      notFound: unique404,
      requestFailed: diagnostics.requestFailed.slice(-20),
      consoleErrors: diagnostics.consoleErrors.slice(-20),
      pageErrors: diagnostics.pageErrors.slice(-10),
    })}`,
  );
}

const outer = `<!doctype html><title>PS1 real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const cue = await (await fetch('/fixture.cue')).blob();
    const companions = await Promise.all([
      fetch('/dot_track01.bin').then(r => r.blob()).then(b => new File([b], 'dot_track01.bin')),
      fetch('/dot_track02.bin').then(r => r.blob()).then(b => new File([b], 'dot_track02.bin')),
    ]);
    document.querySelector('iframe').contentWindow.postMessage({
      type: 'init',
      session: 'ps1-smoke-1',
      file: new File([cue], '${cueName}'),
      companions,
      core: 'pcsx_rearmed',
      name: '${cueName}',
    }, location.origin);
  }, { once: true });
});
window.command = (method, value) => new Promise((resolve, reject) => {
  const id = crypto.randomUUID();
  const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 20000);
  const listener = event => {
    if (event.origin !== location.origin || event.data?.type !== 'reply' || event.data?.id !== id) return;
    removeEventListener('message', listener); clearTimeout(timeout);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.value);
  };
  addEventListener('message', listener);
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'ps1-smoke-1',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'ps1-smoke-1',command,value}, location.origin);
window.isolation = () => ({
  crossOriginIsolated,
  sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
});
</script>`;

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  const pathname = pathnameOf(request.url);
  if (pathname === '/') {
    return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
  }
  try {
    let requested;
    if (pathname === '/fixture.cue') requested = join(fixtures, cueName);
    else if (companions.includes(pathname.slice(1))) requested = join(fixtures, pathname.slice(1));
    else requested = join(root, normalize(pathname).replace(/^[/\\]+/, ''));
    const bytes = await readFile(requested);
    response.writeHead(200, {
      ...headers,
      'content-type': types[extname(requested)] || 'application/octet-stream',
      'content-length': bytes.length,
    });
    response.end(bytes);
  } catch {
    diagnostics.notFound.push(pathname);
    response.writeHead(404, headers).end();
  }
}

function greenDotCenter(png) {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const index = (y * png.width + x) * 4;
      const r = png.data[index];
      const g = png.data[index + 1];
      const b = png.data[index + 2];
      if (g > 140 && g > r + 40 && g > b + 40) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }
  if (count < 80) throw new Error(`PS1 green square not rendered (greenPixels=${count})`);
  return { x: sumX / count, y: sumY / count, count };
}

function attachPageDiagnostics(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      diagnostics.consoleErrors.push(text.slice(0, 240));
      console.error(`CONSOLE ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push(error.message);
    console.error(`PAGEERROR ${error.message}`);
  });
  page.on('requestfailed', (request) => {
    diagnostics.requestFailed.push(`${request.url().slice(0, 160)}:${request.failure()?.errorText || 'unknown'}`);
  });
}

async function awaitReady(page, label) {
  diagnostics.phase = label;
  console.log(`PS1_PHASE ${label}`);
  return withTimeout(page.evaluate(() => window.result), READY_MS, label);
}

async function playOnce(page, { offlineAfterReady }) {
  diagnostics.phase = 'capabilities';
  const result = await awaitReady(page, 'ready');
  if (!result.capabilities?.saveState) throw new Error('PS1 core did not expose save state capability');
  if (!result.capabilities?.seekableMedia) throw new Error('Seekable media mount was not active under COOP/COEP');
  const isolation = await page.evaluate(() => window.isolation());
  if (!isolation.crossOriginIsolated) throw new Error('PS1 page was not cross-origin isolated');
  diagnostics.phase = 'seekableStats';
  const seekable = await withTimeout(
    page.evaluate(() => window.command('seekableStats')),
    20000,
    'seekableStats',
  );
  if (!seekable || seekable.payloadCapacity !== 8 * 1024 * 1024) {
    throw new Error(`unexpected seekable stats: ${JSON.stringify(seekable)}`);
  }
  await page.waitForTimeout(2500);
  if (offlineAfterReady) {
    diagnostics.phase = 'offline';
    await page.context().setOffline(true);
  }
  const frame = page.locator('#game');
  diagnostics.phase = 'render';
  const before = greenDotCenter(PNG.sync.read(await frame.screenshot()));
  diagnostics.phase = 'save';
  const state = await withTimeout(page.evaluate(() => window.command('save')), 20000, 'save');
  if (!(state?.byteLength > 1024)) throw new Error('PS1 core returned an implausibly small save state');
  diagnostics.phase = 'input';
  await page.evaluate(() => window.input(6, 1));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.input(6, 0));
  await page.waitForTimeout(200);
  const moved = greenDotCenter(PNG.sync.read(await frame.screenshot()));
  if (!(moved.x < before.x - 10)) {
    throw new Error(`PS1 left input did not move the green square: ${before.x} -> ${moved.x}`);
  }
  diagnostics.phase = 'load';
  await withTimeout(page.evaluate((saved) => window.command('load', saved), state), 20000, 'load');
  await page.waitForTimeout(250);
  const restored = greenDotCenter(PNG.sync.read(await frame.screenshot()));
  if (Math.abs(restored.x - before.x) > 6) {
    throw new Error(`PS1 save state did not restore square: ${before.x} -> ${restored.x}`);
  }
  return { result, isolation, seekable, state, before, moved, restored };
}

async function runBody() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });
  const server = createServer((request, response) => {
    handler(request, response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  let browser;
  let browser2;
  try {
    diagnostics.phase = 'launch';
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    attachPageDiagnostics(page);
    await page.goto(`http://127.0.0.1:${port}/`);
    const first = await playOnce(page, { offlineAfterReady: true });
    const shot = join(evidenceDir, 'screenshots', 'ps1-gameplay.png');
    await page.screenshot({ path: shot, fullPage: true });
    await browser.close();
    browser = null;

    diagnostics.phase = 'fresh-launch';
    browser2 = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
    });
    const page2 = await browser2.newPage({ viewport: { width: 1280, height: 900 } });
    attachPageDiagnostics(page2);
    await page2.goto(`http://127.0.0.1:${port}/`);
    await awaitReady(page2, 'fresh-ready');
    await page2.waitForTimeout(2500);
    await page2.context().setOffline(true);
    const frame2 = page2.locator('#game');
    diagnostics.phase = 'fresh-render';
    const restarted = greenDotCenter(PNG.sync.read(await frame2.screenshot()));
    await page2.evaluate(() => window.input(6, 1));
    await page2.waitForTimeout(900);
    await page2.evaluate(() => window.input(6, 0));
    const afterRestartMove = greenDotCenter(PNG.sync.read(await frame2.screenshot()));
    if (!(afterRestartMove.x < restarted.x - 10)) {
      throw new Error(`PS1 fresh-browser left input failed: ${restarted.x} -> ${afterRestartMove.x}`);
    }
    console.log(
      `PS1_GAMEPLAY_PASS ${JSON.stringify({
        capabilities: first.result.capabilities,
        isolation: first.isolation,
        seekable: first.seekable,
        stateBytes: first.state.byteLength,
        before: first.before,
        moved: first.moved,
        restored: first.restored,
        restarted,
        afterRestartMove,
        notFoundSample: [...new Set(diagnostics.notFound)].slice(0, 12),
      })}`,
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (browser2) await browser2.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

async function run() {
  console.log(
    `PS1_SMOKE_START ${JSON.stringify({
      readyMs: READY_MS,
      overallMs: OVERALL_MS,
      chromium: executablePath || 'bundled',
    })}`,
  );
  try {
    await withTimeout(runBody(), OVERALL_MS, 'PS1 overall');
  } catch (error) {
    dumpDiagnostics(error);
    throw error;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
