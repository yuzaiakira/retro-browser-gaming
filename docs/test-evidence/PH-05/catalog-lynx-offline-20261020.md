# Catalog-installed Atari Lynx offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=lynx node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START lynx
CATALOG_INSTALL_PASS lynx
CATALOG_OFFLINE_START lynx
CATALOG_OFFLINE_PASS lynx
CATALOG_CONSOLE_OFFLINE_PASS {"lynxInstall":true,"lynxOffline":true}
```

Screenshot: `screenshots/catalog-offline-lynx.png`.
