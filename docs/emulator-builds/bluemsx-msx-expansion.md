> Migrated from historical PH-05 engineering notes for stable public corresponding-source packaging.
> Patches/scripts remain authoritative under `scripts/patches/` and rebuild scripts.

# PH-05 MSX expansion — VERIFIED_PLAYABLE (2026-10-22)

## Summary

Independently built EmulatorJS-compatible `bluemsx` (commit `491b366` packages) is integrated for interactive Chromium gameplay and catalog offline cold-start with first-party MIT MSX Dot and C-BIOS 0.23.

## Runtime integration

| Piece | Detail |
|---|---|
| Core | `bluemsx` (`ejs-4.2.3/cores/bluemsx-wasm.data`) |
| SYSTEM pack | `ejs-4.2.3/system/bluemsx-system.data` — C-BIOS Machines + Databases (EmulatorJS does not extract non-js/wasm members from core `.data`) |
| Mount | `EJS_externalFiles['/home/web_user/retroarch/userdata/system/']` |
| `system_directory` | Pinned in `GameManager.getRetroArchCfg()` for `bluemsx` |
| Machine | `bluemsx_msxtype=Auto` (`.rom` → MSX2+ then C-BIOS fallback; explicit `MSX` skips fallback and needs proprietary Shared Roms) |
| Cue | `EJS_disableCue=true` (core.json lists `m3u`; otherwise EJS wraps `.rom` in a fake `.cue`) |
| Control scheme | `segaMS` (no `msx` shortcut in EJS 4.2.3 `getCores`) |
| Registry | `bluemsx` in `supported` set |

## Fixture

| Item | Value |
|---|---|
| ROM | `.fixtures/mit-msx-dot.rom` |
| SHA-256 | `57e77ece49b72b5e0ad319e8c62955c24e887bd426622073f57fbefba108e995` |
| Source | First-party `fixtures/msx-dot/` |
| Build | `zcc +msx -subtype=rom -create-app -O2` via `z88dk/z88dk` |
| License | MIT `LICENSES/msx-dot-MIT.txt` |
| Catalog | `mit-msx-dot` / console `msx` / core `bluemsx` — **PRODUCT_PENDING** |

## Chromium evidence

``bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=msx SKIP_OFFLINE=1 \
  node apps/web/tests/libretro-family-smoke.cjs
# MSX_GAMEPLAY_PASS — inputChangedFrame=true; lit≈464000
# screenshot: docs/emulator-builds/screenshots/msx-gameplay.png

RETRO_TEST_BASE_URL=http://launcher.localhost:13000 CATALOG_OFFLINE_ONLY=msx \
  CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
# CATALOG_CONSOLE_OFFLINE_PASS {"msxInstall":true,"msxOffline":true}
``

## Save states

**Fixed** — see `msx-savestate-abi-20261022.md`. Root cause was `boardInfo.saveState(stateFile)` calling a zero-arg BoardInfo callback (WASM `call_indirect` arity trap), not an EmulatorJS `cwrap` export mismatch. After `0003-board-saveState-zero-arity-wasm.patch`: `saveState:true`, `stateBytes≈4194328`, round-trip restore verified.

## Known limitations

- Prefer Auto + C-BIOS; proprietary MSX system ROMs are not redistributed.
- Favicon 404 in smoke harness is harmless.
- Emscripten `-O3` package SHA-256 may vary across clean rebuild hosts; compare functionally + promote only after lock update.

## Superseded

Older `RXML_LINK_FAILED` / duplicate `rxml_*` logs are superseded by commit `491b366` (merged frontend rxml). Do not treat those as active blockers.
