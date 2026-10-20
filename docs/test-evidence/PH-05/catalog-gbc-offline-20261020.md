# Catalog-installed GBC offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=gbc node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START gbc
CATALOG_INSTALL_PASS gbc
CATALOG_OFFLINE_START gbc
CATALOG_OFFLINE_PASS gbc
CATALOG_CONSOLE_OFFLINE_PASS {"gbcInstall":true,"gbcOffline":true}
```

Screenshot: `screenshots/catalog-offline-gbc.png`  
Run log: `catalog-gbc-offline-run-20261020.txt`
