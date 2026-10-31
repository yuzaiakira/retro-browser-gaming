# libretro-vecx patches (Retro Browser Gaming)

## Pin

| Item | Value |
|------|-------|
| Upstream | https://github.com/libretro/libretro-vecx |
| Commit | `dccff5402a16d1ea7c112095a8e42632bf149506` (2026-10-16) |
| Core license | GPL-3.0 (`LICENSE.md`) |
| Toolchain | `emscripten/emsdk:3.1.74` + EmulatorJS/build `677b1334…` |

## `0001-rbg-external-vectrex-bios.patch`

Removes compile-time embedding of GCE/Milton Bradley Vectrex system ROM
(`bios/system.h` / `rom.dat`, SHA-256 `320ccdcc…`). Loads an **operator-supplied**
8192-byte BIOS from the RetroArch system directory (`system.img`, `vectrex.bin`,
`bios.bin`, or `vecx.rom`). Fail-closed when missing or wrong size.

**Do not** ship `bios/system.h`, `bios/*.bin`, or `rom.dat` in a public
corresponding-source package claimed to be firmware-cleared. Delete those files
from any redistributed tree after applying this patch.

See `docs/emulator-builds/vecx-firmware-audit.md`.
