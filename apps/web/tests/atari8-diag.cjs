const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');

const web = '/home/akira/Projects/git-contribute/retro-browser-gaming/apps/web';
const root = join(web, 'public');
const fixture = join(web, '..', '..', '.fixtures', 'mit-atari8-dot.xex');
const fixtureName = 'mit-atari8-dot.xex';
const session = 'diag';
const outer = `<!doctype html><title>diag</title>
<iframe id="game" style="width:960px;height:640px;border:0" src="/runtime/frame.html"></iframe>
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
      file:new File([bytes], '${fixtureName}'),
      core:'atari800', name:'${fixtureName}'
    }, location.origin);
  }, { once: true });
});
</script>`;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.json': 'application/json',
  '.xex': 'application/octet-stream',
  '.map': 'application/json',
};

(async () => {
  const server = createServer(async (req, res) => {
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
    if (req.url === '/') {
      return res.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
    }
    try {
      const pathname = (req.url || '/').split('?')[0];
      const requested =
        pathname === '/fixture.bin'
          ? fixture
          : join(root, normalize(pathname).replace(/^[/\\]+/, ''));
      const bytes = await readFile(requested);
      res.writeHead(200, {
        ...headers,
        'content-type': types[extname(requested)] || 'application/octet-stream',
        'content-length': bytes.length,
      });
      res.end(bytes);
    } catch {
      res.writeHead(404, headers).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.evaluate(() => window.result);
  await page.waitForTimeout(15000);
  const info = await page.evaluate(() => {
    const win = document.querySelector('iframe').contentWindow;
    const canvases = [...win.document.querySelectorAll('canvas')].map((c) => ({
      w: c.width,
      h: c.height,
      cls: c.className,
      id: c.id,
    }));
    const c = win.document.querySelector('canvas');
    let sample = null;
    if (c) {
      const ctx = c.getContext('2d');
      let nonZero = 0;
      let max = 0;
      try {
        const img = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const s = img.data[i] + img.data[i + 1] + img.data[i + 2];
          if (s > 0) nonZero++;
          if (s > max) max = s;
        }
        sample = { w: c.width, h: c.height, nonZero, max, first: [...img.data.slice(0, 16)] };
      } catch (e) {
        sample = { err: String(e), w: c.width, h: c.height };
      }
    }
    const gm = win.EJS_emulator?.gameManager;
    let fsList = [];
    try {
      fsList = gm.FS.readdir('/');
    } catch (e) {
      fsList = ['err:' + e];
    }
    let xexStat = null;
    try {
      xexStat = gm.FS.stat('/' + win.EJS_gameUrl);
    } catch (e) {
      xexStat = String(e);
    }
    return {
      canvases,
      sample,
      gameUrl: win.EJS_gameUrl,
      opts: win.EJS_defaultOptions,
      fsList: fsList.slice(0, 50),
      xexStat,
      settings: {
        system: win.EJS_emulator?.getCoreOption?.('atari800_system') || null,
      },
    };
  });
  await mkdir('/tmp/atari8-diag', { recursive: true });
  await page.screenshot({ path: '/tmp/atari8-diag/page.png', fullPage: true });
  const b64 = await page.evaluate(async () => {
    const c = document.querySelector('iframe').contentWindow.document.querySelector('canvas');
    return c ? c.toDataURL('image/png').split(',')[1] : null;
  });
  if (b64) await writeFile('/tmp/atari8-diag/canvas.png', Buffer.from(b64, 'base64'));
  console.log(JSON.stringify(info, null, 2));
  console.log(
    'LOGS\n',
    logs
      .filter((l) => /error|atari|404|fail|Altirra|load|WARN|content/i.test(l))
      .slice(0, 60)
      .join('\n'),
  );
  await writeFile('/tmp/atari8-diag/logs.txt', logs.join('\n'));
  await browser.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
