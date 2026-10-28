/**
 * Independent offline RMS restore for MIT Paddle and MIT Notes.
 * Persistent Chromium profile; origin server stopped before pass-2 navigation.
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/j2me-offline-paddle-notes.cjs
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { createServer } = require('node:http');
const { readFile, mkdir, mkdtemp, rm } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { tmpdir } = require('node:os');
const { PNG } = require('pngjs');

const root = join(__dirname, '..', 'public');
const fixturesRoot = join(__dirname, '..', '..', '..', '.fixtures');
const evidenceDir = resolveEvidenceDir('PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jar': 'application/java-archive',
  '.png': 'image/png',
};

function outer(session, jarName) {
  return `<!doctype html><title>j2me offline</title>
<style>body{margin:0;background:#111}iframe{width:360px;height:560px;border:0}</style>
<iframe id="game" src="/runtime/j2me-frame.html"></iframe>
<script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const bytes = await (await fetch('/fixture.bin')).blob();
    document.querySelector('iframe').contentWindow.postMessage({
      type:'init', session:'${session}',
      file:new File([bytes], '${jarName}', { type: 'application/java-archive' }),
      core:'js2me', name:'${jarName}', screenProfile:'240x320'
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
  document.querySelector('iframe').contentWindow.postMessage({type:'command',session:'${session}',id,method,value}, location.origin);
});
window.input = (command, value) => document.querySelector('iframe').contentWindow.postMessage({type:'input',session:'${session}',command,value}, location.origin);
</script>`;
}

async function readPublic(pathname, jarName) {
  if (pathname === '/' || pathname === '') return Buffer.from(outer('sess', jarName));
  if (pathname === '/fixture.bin') return readFile(join(fixturesRoot, jarName));
  return readFile(join(root, normalize(pathname).replace(/^[/\\]+/, '')));
}

function installRoutes(context, jarName) {
  return context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    try {
      const bytes = await readPublic(url.pathname === '/' ? '/' : url.pathname, jarName);
      // Rebuild outer with stable session embedded — use pathname-specific
      let body = bytes;
      if (url.pathname === '/' || url.pathname === '') {
        body = Buffer.from(outer('offline-restore', jarName));
      }
      const ext =
        url.pathname === '/' || url.pathname === ''
          ? '.html'
          : url.pathname === '/fixture.bin'
            ? '.jar'
            : extname(url.pathname);
      await route.fulfill({
        status: 200,
        body,
        headers: {
          'content-type': types[ext] || 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'Content-Security-Policy':
            "default-src 'self' blob:; script-src 'self' blob: 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors 'self'; base-uri 'none'",
        },
      });
    } catch {
      await route.abort();
    }
  });
}

function intFromRecord(rec) {
  if (!rec || rec.length < 4) return null;
  return ((rec[0] & 0xff) << 24) | ((rec[1] & 0xff) << 16) | ((rec[2] & 0xff) << 8) | (rec[3] & 0xff);
}

function strFromRecord(rec) {
  if (!rec) return null;
  return String.fromCharCode(...rec);
}

async function runSuite({ jarName, session, play, readState, isolateOther }) {
  const fixture = join(fixturesRoot, jarName);
  await readFile(fixture);

  let server = createServer(async (req, res) => {
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy':
        "default-src 'self' blob:; script-src 'self' blob: 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors 'self'; base-uri 'none'",
    };
    try {
      const pathname = (req.url || '/').split('?')[0];
      if (pathname === '/') {
        res.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer(session, jarName));
        return;
      }
      const path =
        pathname === '/fixture.bin'
          ? fixture
          : join(root, normalize(pathname).replace(/^[/\\]+/, ''));
      const bytes = await readFile(path);
      res.writeHead(200, {
        ...headers,
        'content-type': types[extname(path)] || 'application/octet-stream',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404, headers).end();
    }
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}/`;
  const profileDir = await mkdtemp(join(tmpdir(), `j2me-off-${session}-`));
  let pass1State = null;
  let midletId = null;

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 480, height: 720 },
    });
    try {
      const page = await context.newPage();
      page.on('pageerror', (e) => console.error(`[${jarName}]`, e.message));
      await page.goto(origin);
      const ready = await page.evaluate(() => window.result);
      midletId = ready.capabilities.midletId;
      await play(page);
      for (let i = 0; i < 30; i++) {
        const snap = await page.evaluate(() => window.command('rmsSnapshot'));
        pass1State = readState(snap);
        if (pass1State != null) break;
        await page.waitForTimeout(200);
      }
      if (pass1State == null) throw new Error(`${jarName}: no RMS state after play`);
      // Isolation: other suite stores must not appear under this midlet snap
      const snap = await page.evaluate(() => window.command('rmsSnapshot'));
      if (isolateOther && isolateOther(snap)) {
        throw new Error(`${jarName}: cross-suite RMS leak`);
      }
      await page.evaluate(() => window.command('dispose'));
      await page.close();
    } finally {
      await context.close();
    }

    await new Promise((r) => server.close(r));
    server = null;

    const context2 = await chromium.launchPersistentContext(profileDir, {
      executablePath,
      headless: true,
      args: ['--no-sandbox'],
      viewport: { width: 480, height: 720 },
    });
    try {
      await installRoutes(context2, jarName);
      await context2.setOffline(true);
      const page2 = await context2.newPage();
      await page2.goto(origin, { waitUntil: 'domcontentloaded' });
      const ready2 = await page2.evaluate(() => window.result);
      if (!ready2.capabilities?.j2meRuntime) throw new Error(`${jarName}: offline relaunch failed`);
      let pass2State = null;
      for (let i = 0; i < 30; i++) {
        const snap = await page2.evaluate(() => window.command('rmsSnapshot'));
        pass2State = readState(snap);
        if (pass2State != null && JSON.stringify(pass2State) === JSON.stringify(pass1State)) break;
        await page2.waitForTimeout(200);
      }
      if (JSON.stringify(pass2State) !== JSON.stringify(pass1State)) {
        throw new Error(
          `${jarName}: offline RMS mismatch pass1=${JSON.stringify(pass1State)} pass2=${JSON.stringify(pass2State)}`,
        );
      }
      await page2.locator('#game').screenshot({
        path: join(evidenceDir, 'screenshots', `j2me-${session}-offline-restore.png`),
      });
      return { midletId, pass1State, pass2State, offline: true };
    } finally {
      await context2.close();
    }
  } finally {
    if (server) {
      try {
        server.close();
      } catch {
        /* closed */
      }
    }
    await rm(profileDir, { recursive: true, force: true });
  }
}

async function main() {
  await mkdir(join(evidenceDir, 'screenshots'), { recursive: true });

  const paddle = await runSuite({
    jarName: 'mit-j2me-paddle.jar',
    session: 'paddle',
    play: async (page) => {
      await page.waitForTimeout(700);
      const lit = PNG.sync.read(await page.locator('#game').screenshot());
      let n = 0;
      for (let i = 0; i < lit.data.length; i += 4) {
        if (lit.data[i] + lit.data[i + 1] + lit.data[i + 2] > 40) n++;
      }
      if (n < 30) throw new Error(`paddle dark (${n})`);
      // Keep moving until at least one paddle hit persists high >= 1.
      for (let round = 0; round < 80; round++) {
        await page.evaluate(() => window.input(6, 1));
        await page.waitForTimeout(25);
        await page.evaluate(() => window.input(6, 0));
        await page.evaluate(() => window.input(7, 1));
        await page.waitForTimeout(25);
        await page.evaluate(() => window.input(7, 0));
        await page.waitForTimeout(80);
        const snap = await page.evaluate(() => window.command('rmsSnapshot'));
        const hi = intFromRecord(snap?.stores?.paddleHi?.records?.['1']);
        if (hi != null && hi >= 1) return;
      }
      throw new Error('paddle: failed to score high>=1 for durable RMS');
    },
    readState: (snap) => {
      const hi = intFromRecord(snap?.stores?.paddleHi?.records?.['1']);
      return hi == null || hi < 1 ? null : { high: hi };
    },
    isolateOther: (snap) => !!(snap?.stores?.dotScore || snap?.stores?.notesBody),
  });

  const notes = await runSuite({
    jarName: 'mit-j2me-notes.jar',
    session: 'notes',
    play: async (page) => {
      await page.waitForTimeout(600);
      const fr = page.frames().find((f) => f.url().includes('j2me-frame'));
      const ok = await fr.evaluate(() => {
        const input = document.querySelector('#screen input');
        if (!input) return false;
        input.value = 'offline-note-42';
        return true;
      });
      if (!ok) throw new Error('notes input missing');
      await fr.evaluate(() => {
        document.getElementById('choice').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      await page.waitForTimeout(700);
    },
    readState: (snap) => {
      const body = strFromRecord(snap?.stores?.notesBody?.records?.['1']);
      return body == null ? null : { note: body };
    },
    isolateOther: (snap) => !!(snap?.stores?.dotScore || snap?.stores?.paddleHi),
  });

  if (notes.pass1State.note !== 'offline-note-42') {
    throw new Error(`notes unexpected ${JSON.stringify(notes.pass1State)}`);
  }

  console.log(
    'J2ME_OFFLINE_PADDLE_NOTES_PASS',
    JSON.stringify({ paddle, notes, originServerStopped: true }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
