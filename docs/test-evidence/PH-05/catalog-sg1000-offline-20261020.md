# Catalog-installed SG-1000 offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=sg1000 node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START sg1000
CATALOG_INSTALL_PASS sg1000
CATALOG_OFFLINE_START sg1000
CATALOG_OFFLINE_PASS sg1000
CATALOG_CONSOLE_OFFLINE_PASS {"sg1000Install":true,"sg1000Offline":true}
```

Screenshot: `screenshots/catalog-offline-sg1000.png`
