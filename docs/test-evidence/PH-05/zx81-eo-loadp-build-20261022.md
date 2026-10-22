# ZX81 patched core build — `81_eo` (2026-10-22)

## Purpose

Independently versioned EmulatorJS-compatible EightyOne WASM that:

1. Calls `eo_loadp` for `.p` content (skips fragile BASIC `LOAD ""`).
2. Leaves `.tzx` / `.t81` (`ZXTape!` / `EO81`) on the FlashLoad tape path.
3. Initializes `state.devices[]` to `RETRO_DEVICE_JOYPAD` so keybovl joymap works under EmulatorJS.

Does **not** overwrite pinned `81-wasm.data` from EmulatorJS 4.2.3.

## Build

- Host: Docker `emscripten/emsdk:3.1.74`
- Tooling: `EmulatorJS/build` `build.sh -c=81`
- Source: libretro/81-libretro + local patch (`eo_loadp` + joypad device init)
- EmulatorJS RetroArch link via upstream build scripts

## Artifacts

| File | Role |
| --- | --- |
| `apps/web/public/cores/ejs-4.2.3/cores/81_eo-wasm.data` | WebGL2 package |
| `apps/web/public/cores/ejs-4.2.3/cores/81_eo-legacy-wasm.data` | Legacy WebGL |
| `apps/web/public/cores/ejs-4.2.3/cores/reports/81_eo.json` | Cache/report stamp |

Original pinned `81*.data` unchanged.
