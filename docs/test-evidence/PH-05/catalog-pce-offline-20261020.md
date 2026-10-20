# Catalog-installed PCE offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=pce node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START pce
CATALOG_INSTALL_PASS pce
CATALOG_OFFLINE_START pce
CATALOG_OFFLINE_PASS pce
CATALOG_CONSOLE_OFFLINE_PASS {"pceInstall":true,"pceOffline":true}
```

Screenshot: `screenshots/catalog-offline-pce.png`
