# Catalog-installed SNES offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=snes node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START snes
CATALOG_INSTALL_PASS snes
CATALOG_OFFLINE_START snes
CATALOG_OFFLINE_PASS snes
CATALOG_CONSOLE_OFFLINE_PASS {"snesInstall":true,"snesOffline":true}
```

Screenshot: `screenshots/catalog-offline-snes.png`  
Run log: `catalog-snes-offline-run-20261020.txt`
