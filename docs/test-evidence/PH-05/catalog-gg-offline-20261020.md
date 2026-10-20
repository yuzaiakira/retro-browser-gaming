# Catalog-installed Game Gear offline cold-start — 2026-10-20

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  CATALOG_OFFLINE_ONLY=gg node apps/web/tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_PASS gg
CATALOG_OFFLINE_PASS gg
CATALOG_CONSOLE_OFFLINE_PASS {"ggInstall":true,"ggOffline":true}
```

Screenshot: `screenshots/catalog-offline-gg.png`  
Run log: `catalog-gg-offline-run-20261020.txt`

## Scope exercised

- Catalog page `mit-gg-waternet` → install (or reuse) → Play
- Keyboard ArrowLeft and Touch Left → InputRouter commands
- Save state → leave player (lifecycle dispose) → library
- Fresh Chromium persistent profile reopen with `setOffline(true)`
- Offline library → Play → Load state → “State restored”

Core framebuffer gameplay remains evidenced by `gg-gameplay-20261020.md`.
