#!/usr/bin/env node
/**
 * Local TLS terminator in front of Compose edge (HTTP).
 * Hostnames: launcher.localhost / j2me.localhost → http://127.0.0.1:EDGE_PORT
 *
 * Usage:
 *   node scripts/dev-https-edge-proxy.mjs
 *   HTTPS_LISTEN=13443 EDGE_UPSTREAM=http://127.0.0.1:13000 node scripts/dev-https-edge-proxy.mjs
 */
import { createServer } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const certDir = join(root, 'infra', 'dev-certs');
const listenPort = Number(process.env.HTTPS_LISTEN || 13443);
const upstream = new URL(process.env.EDGE_UPSTREAM || 'http://127.0.0.1:13000');

const keyPath = join(certDir, 'server.key.pem');
const certPath = join(certDir, 'server.cert.pem');
if (!existsSync(keyPath) || !existsSync(certPath)) {
  console.error('Missing certs. Run: bash scripts/generate-dev-https-certs.sh');
  process.exit(1);
}

const server = createServer(
  {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  },
  (req, res) => {
    const host = req.headers.host || '';
    const name = host.split(':')[0].toLowerCase();
    if (name !== 'launcher.localhost' && name !== 'j2me.localhost' && name !== 'localhost') {
      res.writeHead(421, { 'content-type': 'text/plain' });
      res.end('Misdirected Request');
      return;
    }
    const headers = { ...req.headers, host: `${name}${upstream.port ? ':' + upstream.port : ''}` };
    // Preserve original host for Next middleware Host checks.
    headers.host = `${name}${upstream.port && upstream.port !== '80' ? ':' + upstream.port : ''}`;
    // Edge listens on 80 inside docker mapped to 13000 — Host should be hostname only or with published port.
    // Our Compose edge uses server_name launcher.localhost without port — Host: launcher.localhost is enough.
    headers.host = name;
    headers['x-forwarded-proto'] = 'https';
    headers['x-forwarded-host'] = host;

    const proxy = httpRequest(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port,
        path: req.url,
        method: req.method,
        headers,
      },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      },
    );
    proxy.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('Bad gateway: ' + err.message);
    });
    req.pipe(proxy);
  },
);

server.listen(listenPort, '127.0.0.1', () => {
  console.log(
    JSON.stringify({
      listening: `https://127.0.0.1:${listenPort}`,
      hosts: ['launcher.localhost', 'j2me.localhost'],
      upstream: upstream.href,
    }),
  );
});
