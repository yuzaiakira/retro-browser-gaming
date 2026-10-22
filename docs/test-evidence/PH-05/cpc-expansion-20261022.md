# Amstrad CPC expansion (2026-10-22)

## Core

| Core | Package | License | Firmware |
| --- | --- | --- | --- |
| `cap32` | EmulatorJS 4.2.3 CDN (`cap32-wasm.data` + legacy + report); npm `@emulatorjs/core-cap32@4.2.3` | GPLv2+ Caprice32 / libretro-cap32 (+ EJS packaging) | Amstrad CPC OS/BASIC embedded in Cap32 — **no separate Amstrad ROM files redistributed** |

Pinned in `docs/core-package-lock.json` (**357** files). Blob-URL load path in `frame.js`. Explicit `EJS_core=cap32` (no `cpc`/`amstrad` getCores shortcut). Control scheme pinned to `cap32`. Default model `6128`. Cap32 **autostarts** DSK/CDT/M3U.

## Fixture (engineering catalog only; product-pending)

| Slug | File | License | Source |
| --- | --- | --- | --- |
| `mit-cpc-brickblaster` | `.fixtures/mit-cpc-brickblaster.dsk` | MIT | `issalig/brick_blaster` release `v1.0_RC4` `dist/brickb_en.dsk` |

SHA-256: `0213b3b5ef409c0ba66916771c9b3379dcab5236c10bce2313ffa9d00f1600e1`

Controls: O/P / arrows move paddle; SPACE / RetroPad fire launches. Smoke uses fire + horizontal D-Pad.

## Commands and results

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 357 files

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=cpc node apps/web/tests/libretro-family-smoke.cjs
# CPC_GAMEPLAY_PASS … beforeHash≠movedHash; controlScheme cap32; stateBytes 131352

./scripts/compose.sh build api web && ./scripts/compose.sh up -d --force-recreate api web
./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=cpc \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS {"cpcInstall":true,"cpcOffline":true}

# Regression
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=amiga SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# AMIGA_GAMEPLAY_PASS
```

Logs: `cpc-gameplay-20261022.txt`, `catalog-cpc-offline-20261022.txt`.  
Screenshot: `screenshots/cpc-gameplay.png`.

## Notes

- Product approval remains **pending**.
- Console may log a benign 404 for an optional Cap32 localization asset; gameplay and saves still pass.
- ZX81 remains EXPERIMENTAL (`LOAD ""` blocker). MSX / Atari ST remain BLOCKED_CORE.
