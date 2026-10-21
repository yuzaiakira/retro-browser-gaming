/**
 * Chromium evidence that IndexedDbPersistence survives a fresh page load.
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node spikes/j2me-rms/idb-persistence.browser.cjs
 */
const { chromium } = require('../../apps/web/node_modules/@playwright/test');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

const spikeRoot = join(__dirname);
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const pageHtml = `<!doctype html><title>RMS IDB</title>
<script type="module">
import { RecordStoreManager, resetProcessStores } from './record-store.mjs';
import { IndexedDbPersistence } from './idb-persistence.mjs';

window.runPass1 = async () => {
  resetProcessStores();
  const persistence = new IndexedDbPersistence('retro-j2me-rms-test');
  const mgr = new RecordStoreManager({ persistence, maxBytesPerMidlet: 64 * 1024 });
  const rs = await mgr.openRecordStore('midlet.demo', 'scores', true);
  const id = await rs.addRecord(Uint8Array.from([7, 8, 9]));
  await rs.closeRecordStore();
  return { id, stores: await mgr.listRecordStores('midlet.demo') };
};

window.runPass2 = async () => {
  resetProcessStores();
  const persistence = new IndexedDbPersistence('retro-j2me-rms-test');
  const mgr = new RecordStoreManager({ persistence });
  const rs = await mgr.openRecordStore('midlet.demo', 'scores', false);
  const ids = await rs.enumerateRecords();
  const bytes = await rs.getRecord(ids[0]);
  await rs.closeRecordStore();
  return { ids, bytes: Array.from(bytes) };
};
</script>`;

async function main() {
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'content-type': 'text/html' }).end(pageHtml);
        return;
      }
      const path = join(spikeRoot, (req.url || '/').replace(/^\//, ''));
      const bytes = await readFile(path);
      const type = path.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream';
      res.writeHead(200, { 'content-type': type }).end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  const pass1 = await page.evaluate(() => window.runPass1());
  // Fresh document = "browser restart" for same origin IDB
  await page.goto(`http://127.0.0.1:${port}/`);
  const pass2 = await page.evaluate(() => window.runPass2());
  console.log(
    'J2ME_RMS_IDB_PASS',
    JSON.stringify({ pass1, pass2, durable: pass2.bytes?.join(',') === '7,8,9' }),
  );
  if (pass2.bytes?.join(',') !== '7,8,9') process.exitCode = 1;
  await browser.close();
  await new Promise((r) => server.close(r));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
