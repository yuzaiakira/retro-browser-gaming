# Vectrex / Intellivision feasibility (2026-10-21)

## EmulatorJS 4.2.3 CDN inventory

| Package | HTTP GET `…/cores/<name>-wasm.data` | In `@emulatorjs/cores@4.2.3` deps |
| --- | --- | --- |
| `vecx` | **404** | **No** |
| `freeintv` | **404** | **No** |
| (control) `vice_x64sc` | 200 | Yes |
| (control) `puae` | 200 | Yes |

Do **not** pretend these cores exist in the pinned EmulatorJS package set.

## Upstream sources

| Platform | Source | License | WASM practicality |
| --- | --- | --- | --- |
| Vectrex | `libretro/libretro-vecx` (VecX port) | GPL-3.0 | Possible via EmulatorJS/libretro emscripten build pipeline, but **not** shipped in EJS 4.2.3; would need a separately versioned core package + lock entries |
| Intellivision | `libretro/FreeIntv` | GPLv2+ | Same build-path possibility; **also** requires proprietary BIOS |

## Firmware / assets

| Platform | Firmware | Legal interactive fixture candidates |
| --- | --- | --- |
| Vectrex | Typically none (exec ROM in console) | MIT homebrew exists (e.g. `VilleKrumlinde/VectrexThrust`) — usable **after** a redistributable WASM core exists |
| Intellivision | **Required:** `exec.bin` + `grom.bin` (Mattel BIOS; MD5s documented upstream) | Even with a WASM FreeIntv build, **BLOCKED_FIRMWARE** without authorized BIOS redistribution |

## FrameAdapter integration cost

- New core IDs + blob/seekable policy in `frame.js`
- Control scheme (Vectrex analog/buttons; Intellivision keypad — FreeIntv has overlays)
- Catalog console + seed + smoke + lock regeneration
- Estimated effort dominated by **reproducible emscripten core build**, not adapter wiring

## Classification

| Platform | Status | Blocker |
| --- | --- | --- |
| Vectrex | **BLOCKED_CORE** | Absent from EJS 4.2.3 CDN; external WASM build not yet produced |
| Intellivision | **BLOCKED_FIRMWARE** (+ core absent) | Proprietary `exec.bin`/`grom.bin` required; FreeIntv also absent from EJS 4.2.3 CDN |

Next independent work should prefer CDN-present cores with legal fixtures (e.g. Amiga `puae` with AROS fallback Kickstart — separate milestone).
