/**
 * J2ME security: production allowlist path + isolated ZIP validator harness.
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/j2me-security-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const { readFile, writeFile, mkdir, mkdtemp, rm } = require('node:fs/promises');
const { join, normalize, extname } = require('node:path');
const { tmpdir } = require('node:os');
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
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data, method = 0, uncompSize } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const payload = data;
    const uSize = uncompSize != null ? uncompSize : payload.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(uSize, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localHdr = Buffer.concat([local, nameBuf, payload]);
    parts.push(localHdr);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(uSize, 24);
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
  const name = 'META-INF/MANIFEST.MF';
  const manifest = Buffer.from('Manifest-Version: 1.0\nMIDlet-1: X, , x.Y\nMIDlet-Name: Bomb\n');
  const fakeUncomp = 20 * 1024 * 1024;
  const nameBuf = Buffer.from(name, 'utf8');
  const data = deflateRawSync(manifest);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
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

function zipMismatchLocal() {
  const name = 'META-INF/MANIFEST.MF';
  const data = Buffer.from('Manifest-Version: 1.0\nMIDlet-1: X, , x.Y\nMIDlet-Name: M\n');
  const nameBuf = Buffer.from(name, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const localHdr = Buffer.concat([local, nameBuf, data]);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(data.length + 1, 24); // mismatch
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

const prodHtml = `<!doctype html><title>j2me prod security</title>
<iframe id="game"></iframe>
<script>
window.boot = (path, extra) => new Promise((resolve, reject) => {
  const iframe = document.querySelector('#game');
  const session = 'prod-' + Math.random().toString(16).slice(2);
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
        core:'js2me',
        ...(extra || {})
      }, location.origin);
    } catch (e) {
      removeEventListener('message', onMsg);
      reject(e);
    }
  };
  iframe.src = '/runtime/j2me-frame.html?t=' + Date.now();
});
</script>`;

const inspectHtml = `<!doctype html><title>j2me zip inspect</title>
<script src="/runtime/j2me-secure.js"></script>
<script>
window.inspect = async (path) => {
  const buf = await (await fetch(path)).arrayBuffer();
  try {
    return { ok: true, meta: J2meSecure.inspectZip(buf) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
};
</script>`;

async function run() {
  await mkdir(evidenceDir, { recursive: true });
  const tmpDir = await mkdtemp(join(tmpdir(), 'j2me-sec-'));
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
  const dupJar = zipStore([
    {
      name: 'META-INF/MANIFEST.MF',
      data: Buffer.from('Manifest-Version: 1.0\nMIDlet-Name: D\nMIDlet-1: D, , d.X\n'),
    },
    { name: 'a.class', data: Buffer.from([1, 2, 3]) },
    { name: 'a.class', data: Buffer.from([4, 5, 6]) },
  ]);
  await writeFile(join(tmpDir, 'traversal.jar'), traversalJar);
  await writeFile(join(tmpDir, 'unknown.jar'), unknownJar);
  await writeFile(join(tmpDir, 'bomb.jar'), zipDeflatedBomb());
  await writeFile(join(tmpDir, 'mismatch.jar'), zipMismatchLocal());
  await writeFile(join(tmpDir, 'dup.jar'), dupJar);

  const fixtures = {
    '/good.jar': goodJar,
    '/traversal.jar': join(tmpDir, 'traversal.jar'),
    '/unknown.jar': join(tmpDir, 'unknown.jar'),
    '/bomb.jar': join(tmpDir, 'bomb.jar'),
    '/mismatch.jar': join(tmpDir, 'mismatch.jar'),
    '/dup.jar': join(tmpDir, 'dup.jar'),
  };

  const server = createServer(async (req, res) => {
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
        res.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(prodHtml);
        return;
      }
      if (pathname === '/inspect') {
        res.writeHead(200, { ...headers, 'content-type': 'text/html' }).end(inspectHtml);
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

    // --- Production frame path ---
    await page.goto(`http://127.0.0.1:${port}/`);
    const ok = await page.evaluate(() => window.boot('/good.jar'));
    if (!ok.capabilities?.security?.allowlistEnforced) throw new Error('allowlist not enforced');
    if (ok.capabilities.allowUntrusted) throw new Error('allowUntrusted must not appear');
    results.allowlistedBoot = true;

    async function expectProdError(path, extra, substr) {
      await page.goto(`http://127.0.0.1:${port}/`);
      const err = await page.evaluate(
        async ({ path, extra }) => {
          try {
            await window.boot(path, extra);
            return null;
          } catch (e) {
            return String(e.message || e);
          }
        },
        { path, extra },
      );
      if (!err || !err.includes(substr)) {
        throw new Error(`Expected ${substr} for ${path}, got: ${err}`);
      }
      return err;
    }

    results.unknownDenied = await expectProdError('/unknown.jar', {}, 'JAR_NOT_ALLOWLISTED');
    // Critical: client-supplied allowUntrusted must NOT bypass production allowlist
    results.bypassIgnored = await expectProdError(
      '/unknown.jar',
      { allowUntrusted: true },
      'JAR_NOT_ALLOWLISTED',
    );

    // --- Isolated ZIP inspector (test harness, not production frame) ---
    await page.goto(`http://127.0.0.1:${port}/inspect`);
    async function expectInspect(path, substr) {
      const r = await page.evaluate(async (path) => window.inspect(path), path);
      if (r.ok || !String(r.error).includes(substr)) {
        throw new Error(`inspect ${path}: expected ${substr}, got ${JSON.stringify(r)}`);
      }
      return r.error;
    }
    results.traversalDenied = await expectInspect('/traversal.jar', 'JAR_PATH_TRAVERSAL');
    results.bombDenied = await expectInspect('/bomb.jar', 'JAR_ENTRY_TOO_LARGE');
    results.mismatchDenied = await expectInspect('/mismatch.jar', 'JAR_LOCAL_SIZE_MISMATCH');
    results.dupDenied = await expectInspect('/dup.jar', 'JAR_DUPLICATE_ENTRY');

    console.log('J2ME_SECURITY_PASS', JSON.stringify(results));
    await writeFile(
      join(evidenceDir, 'j2me-security-20261021.txt'),
      `J2ME_SECURITY_PASS ${JSON.stringify(results)}\n`,
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
    await rm(tmpDir, { recursive: true, force: true });
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
