# Catalog-installed Master System offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=sms node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_PASS sms
CATALOG_OFFLINE_PASS sms
CATALOG_CONSOLE_OFFLINE_PASS {"smsInstall":true,"smsOffline":true}
```

Screenshot: `screenshots/catalog-offline-sms.png`  
Run log: `catalog-sms-offline-run-20261020.txt`

## Scope exercised

- Catalog page `mit-sms-ninjagirl` → install (or reuse) → Play
- Keyboard ArrowLeft and Touch Left → InputRouter commands
- Save state → leave player (lifecycle dispose) → library
- Fresh Chromium persistent profile reopen with `setOffline(true)`
- Offline library → Play → Load state → “State restored”

Core framebuffer gameplay remains evidenced by `sms-gameplay-20261020.md`.
