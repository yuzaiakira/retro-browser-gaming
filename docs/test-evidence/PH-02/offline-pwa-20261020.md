# Offline PWA gates — 2026-10-20

## Command

```bash
cd apps/web
API_INTERNAL_URL=http://127.0.0.1:18000 npm run build
API_INTERNAL_URL=http://127.0.0.1:18000 PORT=3000 npm run start
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node tests/offline-pwa.cjs
```

Production Next (not `next dev`) is required so cold-start can load shell chunks from Cache Storage.

## Result

```text
OFFLINE_PWA_INSTALL_PASS
OFF_001_COLD_START_LIBRARY_PASS
OFF_002_COLD_START_BOOT_PASS
OFF_003_COLD_START_SAVE_PASS
OFF_004_CORE_EVICTION_PASS {"ok":true,"removedAssets":1,"removedCores":0,"shell":"retro-shell-v3"}
OFF_005_SW_UPDATE_NO_DISRUPT_PASS
OFFLINE_PWA_PASS
```

Screenshot: `PH-02/screenshots/offline-cold-start.png`.

## Coverage

| Gate | Proven |
|---|---|
| OFF-001 | Fresh Chromium persistent-profile process, network disabled before navigate, offline library lists Orbit Catch |
| OFF-002 | Offline play boot to Save state controls |
| OFF-003 | Offline load of previously saved state |
| OFF-004 | OPFS game bytes removed while offline; Player audit fails closed with reinstall UX |
| OFF-005 | Waiting SW (`retro-shell-v3-waiting-test`) does not disrupt active Save state |

Shell version under test: `retro-shell-v3` (`apps/web/public/sw.js` + `offline.ts`).
