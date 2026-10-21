# Dedicated-origin J2ME catalog offline (authentic SW) — 2026-10-21

**Gate type:** Production-like Compose edge + real Service Worker caches.  
**Not used:** Playwright `route.fulfill`, mock asset servers, or network request stubbing for offline delivery.

## Topology

- Edge nginx Host routing on `127.0.0.1:13000`
- `http://launcher.localhost:13000` — launcher / catalog / OPFS
- `http://j2me.localhost:13000` — dedicated runtime + `j2me-sw.js`

## Command

```bash
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
RETRO_J2ME_ORIGIN=http://j2me.localhost:13000 \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-j2me-dedicated-offline.cjs
```

## Result

```text
DEDICATED_INSTALL_PASS dot {"score":4}
DEDICATED_INSTALL_PASS paddle {"high":2}
DEDICATED_INSTALL_PASS notes {"note":"dedicated-offline-note"}
DEDICATED_STOP_ALL_ORIGIN_SERVICES
DEDICATED_OFFLINE_PASS … (all three)
DEDICATED_J2ME_OFFLINE_PASS {"mockedAssets":false,"routeFulfill":false,...,"originServicesStopped":true,"dotOffline":true,"paddleOffline":true,"notesOffline":true}
```

Isolation per title: `parentDom: blocked:SecurityError`, empty cookies, j2me SW `controlled:true` with scope `http://j2me.localhost:13000/`.

Screenshots: `PH-06/screenshots/catalog-dedicated-offline-j2me-{dot,paddle,notes}.png`.  
Run log: `PH-06/catalog-j2me-dedicated-offline-run-20261021.txt`.

## Reliability re-run (atomic SW + SHA-256 precache)

After staging/promote integrity wiring and same-origin manifest load (launcher CSP), the gate was re-executed successfully:

- Run log: `PH-06/catalog-j2me-dedicated-offline-reliability-run-20261021.txt`
- Companion gates: `j2me-sw-integrity-20261021.json`, `j2me-cache-recovery-20261021.json`, `j2me-rms-rollback-safety-20261021.json`
- Still `mockedAssets:false`, `routeFulfill:false`, origin services stopped for offline cold-start.
