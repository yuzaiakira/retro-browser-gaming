/**
 * LOCAL_HTTPS_VERIFIED smoke — trusted OpenSSL dev CA in a Chromium NSS DB,
 * TLS terminator → Compose edge, dual hostnames.
 *
 * Not PRODUCTION_STAGING_VERIFIED.
 *
 * Prerequisites: Compose edge healthy on EDGE_UPSTREAM (default :13000),
 *   bash scripts/generate-dev-https-certs.sh
 *   node scripts/dev-https-edge-proxy.mjs  (or auto-started here)
 *
 * Usage: CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-local-https-smoke.cjs
 */
const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const { mkdir, writeFile, mkdtemp, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

const root = join(__dirname, '..', '..', '..');
const evidenceDir = join(root, 'docs', 'test-evidence', 'PH-06');
const certDir = join(root, 'infra', 'dev-certs');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const httpsPort = Number(process.env.HTTPS_LISTEN || 13443);
const edgeUpstream = process.env.EDGE_UPSTREAM || 'http://127.0.0.1:13000';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureCerts() {
  if (!existsSync(join(certDir, 'ca.cert.pem')) || !existsSync(join(certDir, 'server.cert.pem'))) {
    execFileSync('bash', [join(root, 'scripts', 'generate-dev-https-certs.sh')], {
      stdio: 'inherit',
    });
  }
}

function trustCaInProfile(profileDir) {
  const nssDir = join(profileDir, 'nssdb');
  execFileSync('mkdir', ['-p', nssDir]);
  execFileSync('certutil', ['-N', '-d', `sql:${nssDir}`, '--empty-password']);
  execFileSync('certutil', [
    '-A',
    '-d',
    `sql:${nssDir}`,
    '-t',
    'C,,',
    '-n',
    'RBG-Dev-CA',
    '-i',
    join(certDir, 'ca.cert.pem'),
  ]);
  return nssDir;
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  await ensureCerts();

  // Health of upstream edge
  const http = require('node:http');
  const edgeOk = await new Promise((resolve) => {
    const req = http.request(
      edgeUpstream,
      { method: 'GET', headers: { Host: 'launcher.localhost' }, timeout: 3000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200 || res.statusCode === 304);
      },
    );
    req.on('error', () => resolve(false));
    req.end();
  });
  if (!edgeOk) {
    const report = {
      at: new Date().toISOString(),
      label: 'LOCAL_HTTPS_NOT_RUN',
      reason: `Compose edge not healthy at ${edgeUpstream}`,
      passed: false,
    };
    await writeFile(
      join(evidenceDir, 'j2me-local-https-20261021.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  // Best-effort clear of a stale local proxy on the listen port.
  try {
    execFileSync('fuser', ['-k', `${httpsPort}/tcp`], { stdio: 'ignore' });
    await sleep(300);
  } catch {
    /* none */
  }

  const proxy = spawn('node', [join(root, 'scripts', 'dev-https-edge-proxy.mjs')], {
    env: { ...process.env, HTTPS_LISTEN: String(httpsPort), EDGE_UPSTREAM: edgeUpstream },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let proxyReady = false;
  let proxyErr = '';
  proxy.stdout.on('data', (b) => {
    if (String(b).includes('listening')) proxyReady = true;
  });
  proxy.stderr.on('data', (b) => {
    proxyErr += String(b);
  });
  for (let i = 0; i < 50 && !proxyReady; i++) await sleep(100);
  if (!proxyReady) {
    proxy.kill();
    throw new Error('HTTPS proxy failed to start: ' + proxyErr.slice(0, 400));
  }

  const profileDir = await mkdtemp(join(tmpdir(), 'rbg-https-'));
  const nssDir = trustCaInProfile(profileDir);

  const launcher = `https://launcher.localhost:${httpsPort}`;
  const j2me = `https://j2me.localhost:${httpsPort}`;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--host-resolver-rules=MAP launcher.localhost 127.0.0.1,MAP j2me.localhost 127.0.0.1',
      `--ssl-key-log-file=${join(profileDir, 'ssl.log')}`,
    ],
    env: {
      ...process.env,
      SSL_CERT_FILE: join(certDir, 'ca.cert.pem'),
      NODE_EXTRA_CA_CERTS: join(certDir, 'ca.cert.pem'),
      // Chromium NSS: point HOME so sql:~/.pki is under profile — use certutil path via
      // NSS_DEFAULT_DB_TYPE and copying won't auto-apply; Playwright Chromium uses its own store.
      // Prefer ignoreHTTPSErrors:false with explicit CA via CDP Security.setIgnoreCertificateErrors false
      // and launch with --use-system-ca? 
    },
  });

  // Playwright cannot easily inject NSS into bundled Chromium. Use a context that
  // loads the CA via Node fetch proof + page.goto with ignoreHTTPSErrors only as fallback.
  // First attempt: custom chromium arg --ignore-certificate-errors is NOT trusted.
  // Real trust path: use `certutil` + Chromium flag `--user-data-dir` with NSS in
  // `$HOME/.pki/nssdb` by setting HOME to profileDir.
  await browser.close();

  const browser2 = await chromium.launchPersistentContext(profileDir, {
    executablePath,
    headless: true,
    ignoreHTTPSErrors: false,
    args: [
      '--host-resolver-rules=MAP launcher.localhost 127.0.0.1,MAP j2me.localhost 127.0.0.1',
      '--password-store=basic',
    ],
    env: {
      ...process.env,
      HOME: profileDir,
      SSL_CERT_DIR: certDir,
      SSL_CERT_FILE: join(certDir, 'ca.cert.pem'),
    },
  });

  // Place NSS DB where Chromium/NSS looks relative to HOME
  const homeNss = join(profileDir, '.pki', 'nssdb');
  execFileSync('mkdir', ['-p', join(profileDir, '.pki')]);
  try {
    execFileSync('cp', ['-a', nssDir, homeNss]);
  } catch {
    execFileSync('mkdir', ['-p', homeNss]);
    execFileSync('certutil', ['-N', '-d', `sql:${homeNss}`, '--empty-password']);
    execFileSync('certutil', [
      '-A',
      '-d',
      `sql:${homeNss}`,
      '-t',
      'C,,',
      '-n',
      'RBG-Dev-CA',
      '-i',
      join(certDir, 'ca.cert.pem'),
    ]);
  }

  const page = await browser2.newPage();
  const assertions = {
    secureContextLauncher: false,
    secureContextJ2me: false,
    swRegister: false,
    hostRejection: false,
    cookieIsolation: false,
    j2meInstallBoot: false,
    tlsHostnameOk: false,
    manifestIntegrityFetch: false,
    installPostMessage: false,
  };

  try {
    await page.goto(launcher + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    assertions.tlsHostnameOk = true;
    assertions.secureContextLauncher = await page.evaluate(() => window.isSecureContext === true);

    await page.evaluate(() => {
      document.cookie = 'launcher_session=secret-https; path=/; Secure; SameSite=Lax';
    });

    const j2mePage = await browser2.newPage();
    await j2mePage.goto(j2me + '/j2me-install.html?parentOrigin=' + encodeURIComponent(launcher), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    assertions.secureContextJ2me = await j2mePage.evaluate(() => window.isSecureContext === true);
    assertions.swRegister = await j2mePage.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('/j2me-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return !!reg;
    });
    assertions.j2meInstallBoot = await j2mePage.evaluate(() => location.pathname.includes('j2me-install'));
    assertions.cookieIsolation = await j2mePage.evaluate(() => document.cookie === '');

    // Unknown host via Host header spoof is edge-level; probe proxy 421
    const bad = await page.evaluate(async (port) => {
      try {
        const res = await fetch(`https://127.0.0.1:${port}/`, {
          headers: { Host: 'evil.example' },
        });
        return res.status;
      } catch (e) {
        return String(e.message || e);
      }
    }, httpsPort);
    // fetch from page may not allow Host override; check proxy directly from Node
    const https = require('node:https');
    const ca = require('node:fs').readFileSync(join(certDir, 'ca.cert.pem'));
    const status421 = await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: '127.0.0.1',
          port: httpsPort,
          path: '/',
          method: 'GET',
          headers: { Host: 'evil.example' },
          ca,
          servername: 'launcher.localhost',
          rejectUnauthorized: true,
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', (e) => resolve(String(e.message)));
      req.end();
    });
    assertions.hostRejection = status421 === 421;
    void bad;

    const manifestStatus = await new Promise((resolve) => {
      const req = https.request(
        {
          hostname: '127.0.0.1',
          port: httpsPort,
          path: '/runtime/j2me-runtime-manifest.json',
          method: 'GET',
          headers: { Host: 'j2me.localhost' },
          ca,
          servername: 'j2me.localhost',
          rejectUnauthorized: true,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              const j = JSON.parse(body);
              resolve(res.statusCode === 200 && Array.isArray(j.entries) && j.entries.length > 0);
            } catch {
              resolve(false);
            }
          });
        },
      );
      req.on('error', () => resolve(false));
      req.end();
    });
    assertions.manifestIntegrityFetch = !!manifestStatus;

    // Cross-origin install boot via iframe postMessage
    assertions.installPostMessage = await page.evaluate(async (j2meOrigin) => {
      return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        const t = setTimeout(() => resolve(false), 45000);
        window.addEventListener('message', function onMsg(e) {
          if (e.origin !== j2meOrigin) return;
          if (e.data?.channel !== 'j2me-install') return;
          if (e.data.type === 'boot') {
            clearTimeout(t);
            window.removeEventListener('message', onMsg);
            iframe.remove();
            resolve(true);
          }
          if (e.data.type === 'error') {
            clearTimeout(t);
            window.removeEventListener('message', onMsg);
            iframe.remove();
            resolve(false);
          }
        });
        iframe.src =
          j2meOrigin + '/j2me-install.html?parentOrigin=' + encodeURIComponent(location.origin);
        document.body.appendChild(iframe);
      });
    }, j2me);

    const report = {
      at: new Date().toISOString(),
      label: 'LOCAL_HTTPS_VERIFIED',
      not: 'PRODUCTION_STAGING_VERIFIED',
      launcher,
      j2me,
      edgeUpstream,
      ca: 'infra/dev-certs/ca.cert.pem (NSS sql import into ephemeral Chromium HOME)',
      assertions,
      trustModel: 'OpenSSL local CA + certutil NSS import (not system trust store)',
    };
    report.passed = Object.values(assertions).every(Boolean);
    await writeFile(
      join(evidenceDir, 'j2me-local-https-20261021.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    await browser2.close().catch(() => {});
    proxy.kill('SIGTERM');
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
