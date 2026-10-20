# Catalog-installed WonderSwan offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=wswan node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_START wswan
CATALOG_INSTALL_PASS wswan
CATALOG_OFFLINE_START wswan
CATALOG_OFFLINE_PASS wswan
CATALOG_CONSOLE_OFFLINE_PASS {"wswanInstall":true,"wswanOffline":true}
```

Screenshot: `screenshots/catalog-offline-wswan.png`
