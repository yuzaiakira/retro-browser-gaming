# Catalog-installed GBA offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=gba node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START gba
CATALOG_INSTALL_PASS gba
CATALOG_OFFLINE_START gba
CATALOG_OFFLINE_PASS gba
CATALOG_CONSOLE_OFFLINE_PASS {"gbaInstall":true,"gbaOffline":true}
```

Screenshot: `screenshots/catalog-offline-gba.png`  
Run log: `catalog-gba-offline-run-20261020.txt`
