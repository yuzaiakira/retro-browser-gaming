# Catalog-installed Neo Geo Pocket Color offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=ngpc node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START ngpc
CATALOG_INSTALL_PASS ngpc
CATALOG_OFFLINE_START ngpc
CATALOG_OFFLINE_PASS ngpc
CATALOG_CONSOLE_OFFLINE_PASS {"ngpcInstall":true,"ngpcOffline":true}
```

Screenshot: `screenshots/catalog-offline-ngpc.png`.
