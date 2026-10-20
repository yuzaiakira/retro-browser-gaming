# Catalog-installed NES offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=nes node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_PASS nes
CATALOG_OFFLINE_PASS nes
CATALOG_CONSOLE_OFFLINE_PASS {"nesInstall":true,"nesOffline":true}
```

Screenshot: `screenshots/catalog-offline-nes.png`  
Run log: `catalog-nes-offline-run-20261020.txt`

## Scope exercised

- Catalog page `mit-nes-table-tennis` → install → Play
- Keyboard ArrowLeft and Touch Left → InputRouter commands
- Save state → leave player (lifecycle dispose) → library
- Fresh Chromium persistent profile reopen with `setOffline(true)`
- Offline library → Play → Load state → “State restored”

Core framebuffer gameplay remains evidenced by `nes-gameplay-20261020.md`.
