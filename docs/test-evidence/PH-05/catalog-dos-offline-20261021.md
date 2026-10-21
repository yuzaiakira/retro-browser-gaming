# Catalog-installed MS-DOS offline cold-start — 2026-10-21

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=dos node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_PASS dos
CATALOG_OFFLINE_START dos
CATALOG_OFFLINE_PASS dos
CATALOG_CONSOLE_OFFLINE_PASS {"dosInstall":true,"dosOffline":true}
```

Screenshot: `screenshots/catalog-offline-dos.png`
