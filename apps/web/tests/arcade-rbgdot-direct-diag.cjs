/**
 * Direct mame-frame diagnostic (bypasses catalog) — captures console + machine ready.
 */
const { chromium } = require('playwright');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir = resolveEvidenceDir('PH-12/arcade');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

const zipCandidates = [
  join(__dirname, '../../../.fixtures/mit-arcade-rbgdot.zip'),
  join(__dirname, '../../../fixtures/arcade-rbgdot/mit-arcade-rbgdot.zip'),
];

(async () => {
  const zipPath = zipCandidates.find((p) => existsSync(p));
  if (!zipPath) {
    console.error('ARCADE_DIAG_NO_ZIP');
    process.exit(2);
  }
  const zipBuf = readFileSync(zipPath);

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const lines = [];
  page.on('console', (m) => lines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));

  await page.goto(`${baseUrl}/runtime/mame-frame.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async ({ zipB64, origin }) => {
    const bin = Uint8Array.from(atob(zipB64), (c) => c.charCodeAt(0));
    const file = new File([bin], 'mit-arcade-rbgdot.zip', { type: 'application/zip' });
    window.postMessage(
      {
        type: 'init',
        session: 'diag-1',
        parentOrigin: origin,
        core: 'mame_rbg_arcade',
        file,
      },
      origin,
    );
  }, { zipB64: zipBuf.toString('base64'), origin: baseUrl });

  let ready = null;
  let err = null;
  page.on('console', () => {});
  const result = await Promise.race([
    page.waitForFunction(() => {
      const s = document.getElementById('status');
      const t = s ? s.textContent || '' : '';
      return (
        (!s || s.style.display === 'none' || !t) &&
        window.JSMAME &&
        (window.JSMAME.running || (window.JSMAME.get_machine && window.JSMAME.get_machine()))
      );
    }, { timeout: 120000 }).then(() => 'machine'),
    page.waitForEvent('console', {
      predicate: (m) => /ABORT|MAME_MACHINE_START_TIMEOUT|glShadeModel|missing function/i.test(m.text()),
      timeout: 120000,
    }).then((m) => `console:${m.text()}`),
  ]).catch((e) => `timeout:${e.message}`);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(evidenceDir, 'screenshots', 'arcade-direct-diag.png') });

  const diag = await page.evaluate(() => {
    const J = window.JSMAME || {};
    let ptr = 0;
    try {
      ptr = J.get_machine ? J.get_machine() : 0;
    } catch {
      /* */
    }
    const c = document.getElementById('canvas');
    return {
      running: !!J.running,
      machinePtr: ptr,
      canvas: c ? { w: c.width, h: c.height } : null,
      status: document.getElementById('status')?.textContent || '',
      hasModule: !!window.Module,
    };
  });

  const evidence = {
    result,
    diag,
    consoleTail: lines.slice(-100),
    zipPath,
    at: new Date().toISOString(),
  };
  writeFileSync(join(evidenceDir, 'arcade-direct-diag.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  await browser.close();
  if (diag.running || diag.machinePtr) {
    console.log('ARCADE_DIRECT_DIAG_MACHINE_OK');
    process.exit(0);
  }
  console.error('ARCADE_DIRECT_DIAG_FAIL');
  process.exit(1);
})().catch((e) => {
  console.error('ARCADE_DIRECT_DIAG_FAIL', e);
  process.exit(1);
});
