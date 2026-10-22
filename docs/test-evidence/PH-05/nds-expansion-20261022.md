# Nintendo DS expansion (2026-10-22)

## Core selection

| Candidate | CDN package | Firmware | Decision |
| --- | --- | --- | --- |
| `melonds` | Present (`@emulatorjs/core-melonds@4.2.3`) | Requires proprietary `bios7.bin` / `bios9.bin` / `firmware.bin` | **Rejected** for redistributable launcher |
| `desmume` | Present (`@emulatorjs/core-desmume@4.2.3`) | External BIOS **optional**; HLE by default | **Selected** |
| `desmume2015` | Present | Same family | Not needed |

Pinned: `desmume-wasm.data` + legacy + report in `docs/core-package-lock.json` (**360** files). Explicit `EJS_core=desmume`, control scheme `nds`. `desmume_use_external_bios=disabled`. Mouse/touch enabled (`supportsMouse`).

## Fixture (engineering catalog only; product-pending)

| Slug | File | License | Source |
| --- | --- | --- | --- |
| `mit-nds-dinods` | `.fixtures/mit-nds-dinods.nds` | MIT | `BotRandomness/DinoDS` release `v1.0.0` |

SHA-256: `f31cc7de00f33394639280caf1069f9e63b4937ae04bc968a0413045455efdcc`

Controls: A or stylus tap jumps. Smoke proves RetroPad A + pointer events on the lower (touch) screen.

## Commands and results

```bash
python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 360 files

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=nds node apps/web/tests/libretro-family-smoke.cjs
# NDS_GAMEPLAY_PASS … controlScheme nds; stateBytes 12582936; inputChangedFrame true

./scripts/compose.sh build api web && ./scripts/compose.sh up -d --force-recreate api web
./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=nds \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS {"ndsInstall":true,"ndsOffline":true}

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=cpc SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# CPC_GAMEPLAY_PASS (regression)
```

Logs: `nds-gameplay-20261022.txt`, `catalog-nds-offline-20261022.txt`.  
Screenshot: `screenshots/nds-gameplay.png` (dual-screen stacked layout).

## Notes

- Product approval remains **pending**.
- Proprietary Nintendo DS firmware is **not** redistributed.
- Physical gamepad / iOS Safari remain open (P0 RC).
