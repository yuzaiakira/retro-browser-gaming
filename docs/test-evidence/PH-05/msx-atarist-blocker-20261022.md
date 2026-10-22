# MSX / Atari ST feasibility (2026-10-22)

## EmulatorJS 4.2.3 CDN

| Package | HTTP GET `…/cores/<name>-wasm.data` | In `@emulatorjs/cores@4.2.3` |
| --- | --- | --- |
| `bluemsx` | **404** | **No** |
| `hatari` | **404** | **No** |
| (control) `puae` | 200 | Yes |
| (control) `81` (ZX81) | 200 | Yes |

`getCores()` has **no** `msx` or `atarist` system keys in EmulatorJS 4.2.3.

## Upstream / firmware notes

| Platform | Upstream candidate | Firmware |
| --- | --- | --- |
| MSX | BlueMSX libretro (not packaged in EJS 4.2.3) | Typically needs MSX BIOS/system ROMs; legal redistributable sets are uncommon |
| Atari ST | Hatari libretro (not packaged in EJS 4.2.3) | EmuTOS (GPL) could satisfy firmware **if** a browser Hatari build existed |

## Classification

| Platform | Status | Blocker |
| --- | --- | --- |
| MSX | **BLOCKED_CORE** | No WASM package in pinned EmulatorJS 4.2.3 inventory |
| Atari ST | **BLOCKED_CORE** | No Hatari WASM package in pinned EmulatorJS 4.2.3 inventory |

Next independently feasible CDN cores include ZX81 (`81`), `cap32` (Amstrad CPC), `fbneo`, `melonds`, `virtualjaguar` — each still needs legal fixtures and firmware review.

## External WASM attempt (same day, follow-up)

Built via `EmulatorJS/build` + `emscripten/emsdk:3.1.74` `-c=bluemsx`:

1. Core compiles to objects; Machines/Databases tree present under `compile/bluemsx/system/bluemsx/`.
2. Final `wasm-ld` for `bluemsx_libretro.js` fails with **duplicate `rxml_*` symbols** — `obj-emscripten/.../rxml.o` vs `libretro_emscripten.a(rxml.o)`.
3. Skipping bluemsx's private `rxml.c` under `STATIC_LINKING=1` is insufficient while a stale archive member remains; a hard clean also tripped missing `libretro-font.i` outside the EmulatorJS wrapper path.
4. No `bluemsx-*.data` packages were produced. **Hatari** is absent from `EmulatorJS/build` `cores.json`.

**MSX update (same day):** rxml API skew fixed; `bluemsx-*.data` + C-BIOS Machines locked — see `PH-05/msx-bluemsx-rxml-build-20261022.md`. Gameplay/fixture still open (EXPERIMENTAL, not VERIFIED). **Atari ST** remains **BLOCKED_CORE** (hatari absent).
