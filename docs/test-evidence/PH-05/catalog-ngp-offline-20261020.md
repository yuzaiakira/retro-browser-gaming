# Catalog-installed Neo Geo Pocket offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=ngp node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START ngp
CATALOG_INSTALL_PASS ngp
CATALOG_OFFLINE_START ngp
CATALOG_OFFLINE_PASS ngp
CATALOG_CONSOLE_OFFLINE_PASS {"ngpInstall":true,"ngpOffline":true}
```

Screenshot: `screenshots/catalog-offline-ngp.png`.
