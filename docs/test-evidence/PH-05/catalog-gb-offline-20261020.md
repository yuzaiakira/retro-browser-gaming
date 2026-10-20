# Catalog-installed GB offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=gb node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START gb
CATALOG_INSTALL_PASS gb
CATALOG_OFFLINE_START gb
CATALOG_OFFLINE_PASS gb
CATALOG_CONSOLE_OFFLINE_PASS {"gbInstall":true,"gbOffline":true}
```

Screenshot: `screenshots/catalog-offline-gb.png`  
Run log: `catalog-gb-offline-run-20261020.txt`
