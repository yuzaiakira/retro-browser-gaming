# Commodore 64 + ZX Spectrum expansion (2026-10-21)

## Cores

| Core | Package | License | Firmware |
| --- | --- | --- | --- |
| `vice_x64sc` | EmulatorJS 4.2.3 CDN (`vice_x64sc-wasm.data` + legacy + report) | GPLv2 (+ EJS packaging) | Stock C64 KERNAL/BASIC/CHARGEN **embedded** in the EmulatorJS/VICE build; no separate proprietary ROM files redistributed |
| `fuse` | EmulatorJS 4.2.3 CDN (`fuse-wasm.data` + legacy + report) | GPLv3 (+ EJS packaging) | Spectrum firmware **embedded** per Amstrad redistribution permission upstream; no separate ROM files redistributed |

Pinned in `docs/core-package-lock.json` (**348** files). Both cores use the blob-URL load path in `frame.js` (seekable VFS excluded). `EJS_controlScheme` is pinned to `c64` for VICE and `fuse` for Spectrum (EJS 4.2.3 `getCores()` has **no** `zxspectrum` system key).

VICE defaults enable `vice_autoloadwarp=both` so D64 autostart does not stall on `LOADING` for tens of seconds.

## Fixtures (engineering catalog only; product-pending)

| Slug | File | License | Source |
| --- | --- | --- | --- |
| `mit-c64-wildboa` | `.fixtures/mit-c64-wildboa.prg` (+ tracked `.d64`) | MIT | `tstamborski/Wild-Boa-Snake` release `1.0` — PRG `SNAKE` extracted from `Wild.Snake.Boa.d64` |
| `mit-zx-desolate` | `.fixtures/mit-zx-desolate.tap` | MIT | `nzeemin/spectrum-desolate` release `desolate.tap` |

## Commands and results

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=c64 node apps/web/tests/libretro-family-smoke.cjs
# C64_GAMEPLAY_PASS … controlScheme c64; inputChangedFrame true; stateBytes 193368

CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=spectrum node apps/web/tests/libretro-family-smoke.cjs
# SPECTRUM_GAMEPLAY_PASS … controlScheme fuse; inputChangedFrame true; stateBytes 49448

./scripts/compose.sh exec -T api python manage.py seed_demo --with-console-fixtures
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=c64,spectrum \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS c64+spectrum install+offline

python3 scripts/verify-core-lock.py
# CORE_LOCK_OK 348 files
```

Logs: `c64-gameplay-20261021.txt`, `spectrum-gameplay-20261021.txt`, `catalog-c64-spectrum-offline-20261021.txt`.  
Screenshots: `screenshots/c64-gameplay.png`, `screenshots/spectrum-gameplay.png`.

## Notes

- Product approval remains **pending** for both titles.
- C64 Wild Boa: joystick fire (RetroPad B) then D-Pad; catalog entry is the PRG for fast autostart; `.d64` kept as an engineering disk fixture.
- Spectrum Desolate: keyboard QAOP/6789 (fuse RetroPad mapping sufficient for smoke frame delta); adventure play benefits from a physical/virtual keyboard.
- N64 remains EXPERIMENTAL; Vectrex/Intellivision still lack EJS 4.2.3 CDN packages.
