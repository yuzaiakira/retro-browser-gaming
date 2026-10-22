# Commodore Amiga expansion (2026-10-22)

## Core

| Core | Package | License | Firmware |
| --- | --- | --- | --- |
| `puae` | EmulatorJS 4.2.3 CDN (`puae-wasm.data` + legacy + report) | GPLv2 (+ EJS packaging) | Built-in **AROS Kickstart fallback** when proprietary `kick34005.A500` is absent; proprietary Kickstart **not** redistributed |

Pinned in `docs/core-package-lock.json` (**351** files). Blob-URL load path in `frame.js`. Control scheme pinned to `amiga`.

## Fixture (engineering catalog only; product-pending)

| Slug | File | License | Source |
| --- | --- | --- | --- |
| `mit-amiga-dot` | `.fixtures/mit-amiga-dot.adf` | MIT | First-party `fixtures/amiga-dot/` — m68k binary via `amigadev/crosstools:m68k-amigaos`, ADF via `amitools` `xdftool` |

**Not used:** `mwulffn/AmiGalaga` (MIT source, but game data derived from commercial Galaga ROMs).

Joystick port 2 moves a colored block; fire cycles palette. AROS boot ≈30–35 s before interactive.

## Commands and results

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=amiga node apps/web/tests/libretro-family-smoke.cjs
# AMIGA_GAMEPLAY_PASS … beforeHash≠movedHash; controlScheme amiga; stateBytes 1104272

./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=amiga \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS amiga install+offline

python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 351 files
```

Logs: `amiga-gameplay-20261022.txt`, `catalog-amiga-offline-20261022.txt`.  
Screenshots: `screenshots/amiga-gameplay.png`, catalog offline shot when generated.

## Notes

- Product approval remains **pending**.
- Console logs `Kickstart ROM 'kick34005.A500' not found!` then uses AROS fallback (expected).
- MSX (`bluemsx`) and Atari ST (`hatari`) are **absent** from EmulatorJS 4.2.3 CDN — separate blockers.
