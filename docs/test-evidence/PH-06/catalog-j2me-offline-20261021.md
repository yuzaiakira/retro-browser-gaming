# Catalog-installed J2ME offline cold-start — 2026-10-21

Production Compose launcher path for MIT Dot, Paddle, and Notes. Origin services (`web`, `api`, `object-store`) were stopped before offline relaunch; Chromium used a persistent profile + `setOffline(true)`.

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-j2me-offline.cjs
```

## Result

```text
CATALOG_J2ME_INSTALL_PASS dot {"score":4}
CATALOG_J2ME_INSTALL_PASS paddle {"high":1}
CATALOG_J2ME_INSTALL_PASS notes {"note":"catalog-offline-note"}
CATALOG_J2ME_STOP_ORIGIN
CATALOG_J2ME_OFFLINE_PASS {"dotInstall":true,"dotState":{"score":4},"paddleInstall":true,"paddleState":{"high":1},"notesInstall":true,"notesState":{"note":"catalog-offline-note"},"dotOffline":true,"paddleOffline":true,"notesOffline":true}
```

Screenshots: `PH-06/screenshots/catalog-offline-j2me-{dot,paddle,notes}.png`.

Run log: `PH-06/catalog-j2me-offline-run-20261021.txt`.

## Production CSP fix

Inline js2me boot config was blocked by `/runtime/*` CSP (`script-src` without `unsafe-inline`). Boot config moved to `/runtime/j2me-boot.js`.
