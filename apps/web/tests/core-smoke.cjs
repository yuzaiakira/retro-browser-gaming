const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');

const root = join(__dirname, '..', 'public');
const fixtureName = process.env.GENESIS_FIXTURE || 'mit-genesis-breakout.bin';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const fixture = join(__dirname, '..', '..', '..', '.fixtures', fixtureName);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.data': 'application/octet-stream', '.json': 'application/json', '.bin': 'application/octet-stream' };
const outer = `<!doctype html><title>Genesis real-core smoke</title><style>body{margin:0;background:#111}iframe{width:960px;height:640px;border:0}</style><iframe id="game" src="/runtime/frame.html"></iframe><script>
window.result = new Promise((resolve, reject) => {
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data.type === 'ready') resolve(event.data);
    if (event.data.type === 'error') reject(new Error(event.data.error));
  });
  document.querySelector('iframe').addEventListener('load', async () => {
    const response = await fetch('/fixture.bin');
    const bytes = await response.blob();
    document.querySelector('iframe').contentWindow.postMessage({type:'init',session:'core-smoke-1',file:new File([bytes], '${fixtureName}'),core:'genesis_plus_gx',name:'${fixtureName}'}, location.origin);
  }, { once: true });
});
</script>`;

async function handler(request, response) {
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' };
  if (request.url === '/') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(outer);
  try {
    const requested = request.url === '/fixture.bin' ? fixture : join(root, normalize(request.url).replace(/^[/\\]+/, ''));
    const bytes = await readFile(requested);
    response.writeHead(200, { ...headers, 'content-type': types[extname(requested)] || 'application/octet-stream', 'content-length': bytes.length });
    response.end(bytes);
  } catch { response.writeHead(404, headers).end(); }
}

async function run() {
  const server = createServer((request, response) => { handler(request, response); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => { if (message.type() === 'error') console.error(`CONSOLE ${message.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/`);
    const result = await page.evaluate(() => window.result);
    if (!result.capabilities?.saveState) throw new Error('Genesis core did not expose save state capability');
    await page.evaluate(() => {
      const frame = document.querySelector('iframe');
      frame.contentWindow.postMessage({ type: 'input', session: 'core-smoke-1', command: 3, value: 1 }, location.origin);
      frame.contentWindow.postMessage({ type: 'input', session: 'core-smoke-1', command: 3, value: 0 }, location.origin);
      frame.contentWindow.postMessage({ type: 'input', session: 'core-smoke-1', command: 0, value: 1 }, location.origin);
      frame.contentWindow.postMessage({ type: 'input', session: 'core-smoke-1', command: 0, value: 0 }, location.origin);
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '../../docs/test-evidence/PH-05/screenshots/genesis-core-boot.png', fullPage: true });
    console.log(`GENESIS_CORE_READY ${JSON.stringify(result.capabilities)}`);
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
