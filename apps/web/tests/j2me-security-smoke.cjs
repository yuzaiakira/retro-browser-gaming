/**
 * Negative security tests for js2me frame (allowlist, zip bomb, network fence).
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/j2me-security-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { join, normalize, extname } = require('node:path');
const { deflateRawSync } = require('node:zlib');

const root = join(__dirname, '..', 'public');
const goodJar = join(__dirname, '..', '..', '..', '.fixtures', 'mit-j2me-dot.jar');
const evidenceDir = join(__dirname, '..', '..', '..', 'docs', 'test-evidence', 'PH-06');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jar': 'application/java-archive',
};

function zipStore(entries) {
  // Minimal store-method ZIP (no compression) for malformed / oversized tests.
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // method store
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localHdr = Buffer.concat([local, nameBuf, data]);
    parts.push(localHdr);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cd, nameBuf]));
    offset += localHdr.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, eocd]);
}

function zipDeflatedBomb() {
  // Small compressed payload claiming huge uncompressed size via crafted CD —
  // inspectZip uses CD uncompressed sizes; inflate not required for rejection.
  const name = 'META-INF/MANIFEST.MF';
  const manifest = Buffer.from('Manifest-Version: 1.0\nMIDlet-1: X, , x.Y\nMIDlet-Name: Bomb\n');
  const fakeUncomp = 20 * 1024 * 1024;
  const nameBuf = Buffer.from(name, 'utf8');
  const data = deflateRawSync(manifest);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(fakeUncomp, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const localHdr = Buffer.concat([local, nameBuf, data]);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(8, 10);
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(fakeUncomp, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt32LE(0, 42);
  const cdBuf = Buffer.concat([cd, nameBuf]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(localHdr.length, 16);
  return Buffer.concat([localHdr, cdBuf, eocd]);
}

function pageHtml(session) {
  return `<!doctype html><title>j2me security</title>
<iframe id="game"></iframe>
<script>
window.boot = (path, allowUntrusted) => new Promise((resolve, reject) => {
  const iframe = document.querySelector('#game');
  const session = '${session}-' + Math.random().toString(16).slice(2);
  const onMsg = (event) => {
    if (event.origin !== location.origin) return;
    if (event.data.session !== session) return;
    if (event.data.type === 'ready') { removeEventListener('message', onMsg); resolve(event.data); }
    if (event.data.type === 'error') { removeEventListener('message', onMsg); reject(new Error(event.data.error)); }
  };
  addEventListener('message', onMsg);
  iframe.onload = async () => {
    try {
      const bytes = await (await fetch(path)).blob();
      iframe.contentWindow.postMessage({
        type:'init', session,
        file:new File([bytes], 'test.jar', { type:'application/java-archive' }),
        core:'js2me', allowUntrusted: !!allowUntrusted
      }, location.origin);
    } catch (e) {
      removeEventListener('message', onMsg);
      reject(e);
    }
  };
  iframe.src = '/runtime/j2me-frame.html?t=' + Date.now();
});
</script>`;
}

async function run() {
  await mkdir(join(evidenceDir), { recursive: true });
  const tmpDir = join(evidenceDir, '.sec-tmp');
  await mkdir(tmpDir, { recursive: true });
  const traversalJar = zipStore([
    { name: '../evil.class', data: Buffer.from([0xca, 0xfe]) },
    {
      name: 'META-INF/MANIFEST.MF',
      data: Buffer.from(
        'Manifest-Version: 1.0\nMIDlet-Name: Evil\nMIDlet-1: Evil, , evil.X\nMIDlet-Vendor: X\n',
      ),
    },
  ]);
  const unknownJar = zipStore([
    {
      name: 'META-INF/MANIFEST.MF',
      data: Buffer.from(
        'Manifest-Version: 1.0\nMIDlet-Name: Unknown\nMIDlet-1: Unknown, , u.X\nMIDlet-Vendor: X\n',
      ),
    },
    { name: 'u/X.class', data: Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 52]) },
  ]);
  const bombJar = zipDeflatedBomb();
  await writeFile(join(tmpDir, 'traversal.jar'), traversalJar);
  await writeFile(join(tmpDir, 'unknown.jar'), unknownJar);
  await writeFile(join(tmpDir, 'bomb.jar'), bombJar);

  const fixtures = {
    '/good.jar': goodJar,
    '/traversal.jar': join(tmpDir, 'traversal.jar'),
    '/unknown.jar': join(tmpDir, 'unknown.jar'),
    '/bomb.jar': join(tmpDir, 'bomb.jar'),
  };

  const server = createServer(async (req, res) => {
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      // Outer harness needs unsafe-inline; iframe /runtime/* still gets Next CSP in production.
      'Content-Security-Policy':
        "default-src 'self' blob:; script-src 'self' blob: 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors 'self'; base-uri 'none'",
    };
    try {
      const pathname = (req.url || '/').split('?')[0];
      if (pathname === '/') {
        res.writeHead(200, { ...headers, 'content-type': 'text/html' });
        res.end(pageHtml('sec-1'));
        return;
      }
      const path = fixtures[pathname] || join(root, normalize(pathname).replace(/^[/\\]+/, ''));
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
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
  });
  const results = {};
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/`);

    // 1) Allowlisted good JAR boots
    const ok = await page.evaluate(() => window.boot('/good.jar', false));
    if (!ok.capabilities?.security?.allowlistEnforced) throw new Error('allowlist not enforced');
    results.allowlistedBoot = true;

    // Reload frame for next cases
    async function expectError(path, allowUntrusted, substr) {
      await page.goto(`http://127.0.0.1:${port}/`);
      const err = await page.evaluate(
        async ({ path, allowUntrusted }) => {
          try {
            await window.boot(path, allowUntrusted);
            return null;
          } catch (e) {
            return String(e.message || e);
          }
        },
        { path, allowUntrusted },
      );
      if (!err || !err.includes(substr)) {
        throw new Error(`Expected error containing ${substr} for ${path}, got: ${err}`);
      }
      return err;
    }

    results.unknownDenied = await expectError('/unknown.jar', false, 'JAR_NOT_ALLOWLISTED');
    results.traversalDenied = await expectError('/traversal.jar', true, 'JAR_PATH_TRAVERSAL');
    results.bombDenied = await expectError('/bomb.jar', true, 'JAR_ENTRY_TOO_LARGE');

    // Network fence: after boot, fetch in frame should fail
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.evaluate(() => window.boot('/good.jar', false));
    const net = await page.frames()[1].evaluate(async () => {
      try {
        await fetch('/runtime/j2me-allowlist.json');
        return 'FETCH_OK';
      } catch (e) {
        return String(e.message || e);
      }
    });
    if (!String(net).includes('J2ME_NETWORK_DISABLED') && net !== 'Failed to fetch') {
      // Our stub rejects with J2ME_NETWORK_DISABLED
      if (!String(net).includes('NETWORK')) throw new Error(`network fence failed: ${net}`);
    }
    results.networkFenced = true;

    console.log('J2ME_SECURITY_PASS', JSON.stringify(results));
    await writeFile(join(evidenceDir, 'j2me-security-20261021.txt'), `J2ME_SECURITY_PASS ${JSON.stringify(results)}\n`);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
