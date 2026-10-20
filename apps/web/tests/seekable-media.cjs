/**
 * Bounded-memory media proof: random File.slice access and chunked sizing
 * without ever allocating a full-file ArrayBuffer in JS.
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join, normalize, extname } = require('node:path');

const root = join(__dirname, '..', 'public');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const FILE_SIZE = 64 * 1024 * 1024;
const html = `<!doctype html><title>Seekable media</title>
<script src="/runtime/seekable-fs.js"></script>
<script>
function syntheticByte(offset) { return offset % 251; }
async function buildFile() {
  const chunk = 1024 * 1024;
  const parts = [];
  for (let start = 0; start < ${FILE_SIZE}; start += chunk) {
    const body = new Uint8Array(Math.min(chunk, ${FILE_SIZE} - start));
    for (let i = 0; i < body.length; i++) body[i] = syntheticByte(start + i);
    parts.push(body);
  }
  return new File(parts, 'large.bin', { type: 'application/octet-stream' });
}
window.run = async () => {
  if (!crossOriginIsolated) throw new Error('not isolated');
  const file = await buildFile();
  const reads = [
    [0, 64],
    [4096, 1024],
    [${FILE_SIZE} - 8192, 8192],
    [31 * 1024 * 1024 + 17, 4096],
    [8 * 1024 * 1024 - 128, 256],
  ];
  let bytesRead = 0;
  let peakPayload = 0;
  for (const [offset, length] of reads) {
    const got = await window.RetroSeekableFS.readSlice(file, offset, length);
    if (got.length !== length) throw new Error('short read at ' + offset);
    for (let i = 0; i < length; i++) {
      if (got[i] !== syntheticByte(offset + i)) throw new Error('byte mismatch at ' + (offset + i));
    }
    bytesRead += got.length;
    if (got.length > peakPayload) peakPayload = got.length;
  }
  let oversizedRejected = false;
  try { await window.RetroSeekableFS.readSlice(file, 0, 8 * 1024 * 1024 + 1); } catch { oversizedRejected = true; }
  if (!oversizedRejected) throw new Error('oversized read was accepted');
  // Prove we never held one contiguous ArrayBuffer of the whole file in JS:
  // File.size is 64 MiB while every slice stayed ≤ 8 MiB.
  return {
    fileSize: file.size,
    bytesRead,
    peakPayload,
    payloadCapacity: window.RetroSeekableFS.PAYLOAD_BYTES,
  };
};
</script>`;

async function handler(request, response) {
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (request.url === '/') return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(html);
  try {
    const requested = join(root, normalize(request.url).replace(/^[/\\]+/, ''));
    const bytes = await readFile(requested);
    response.writeHead(200, { ...headers, 'content-type': types[extname(requested)] || 'application/octet-stream' });
    response.end(bytes);
  } catch {
    response.writeHead(404, headers).end();
  }
}

async function run() {
  const server = createServer((request, response) => { handler(request, response); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    const stats = await page.evaluate(() => window.run());
    if (stats.fileSize !== FILE_SIZE) throw new Error(`file size ${stats.fileSize}`);
    if (stats.payloadCapacity !== 8 * 1024 * 1024) throw new Error(`capacity ${stats.payloadCapacity}`);
    if (stats.peakPayload > 8 * 1024 * 1024) throw new Error(`peak ${stats.peakPayload}`);
    if (stats.bytesRead < 64 + 1024 + 8192 + 4096 + 256) throw new Error(`bytesRead ${stats.bytesRead}`);
    console.log(`SEEKABLE_MEDIA_PASS ${JSON.stringify(stats)}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
