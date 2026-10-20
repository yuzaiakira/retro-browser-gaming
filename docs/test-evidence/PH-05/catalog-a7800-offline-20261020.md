# Catalog-installed Atari 7800 offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=a7800 node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START a7800
CATALOG_INSTALL_PASS a7800
CATALOG_OFFLINE_START a7800
CATALOG_OFFLINE_PASS a7800
CATALOG_CONSOLE_OFFLINE_PASS {"a7800Install":true,"a7800Offline":true}
```

Screenshot: `screenshots/catalog-offline-a7800.png` (Offline mode + robotfindskitten running).
