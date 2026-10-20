# Catalog-installed A2600 offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=a2600 node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START a2600
CATALOG_INSTALL_PASS a2600
CATALOG_OFFLINE_START a2600
CATALOG_OFFLINE_PASS a2600
CATALOG_CONSOLE_OFFLINE_PASS {"a2600Install":true,"a2600Offline":true}
```

Screenshot: `screenshots/catalog-offline-a2600.png`
