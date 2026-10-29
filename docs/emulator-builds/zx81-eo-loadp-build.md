> Corresponding-source packaging for independently versioned `81_eo`.
> Patches under `scripts/patches/81_eo/`; stock EmulatorJS `81*.data` unchanged.

# ZX81 patched core build — `81_eo` (2026-10-29)

## Purpose

Independently versioned EmulatorJS-compatible EightyOne WASM that:

1. Calls `eo_loadp` for `.p` content (skips fragile BASIC `LOAD ""`).
2. Leaves `.tzx` / `.t81` (`ZXTape!` / `EO81`) on the FlashLoad tape path.
3. Autostarts z88dk CRT at `$4092` after clearing CDFLAG bit6 and skipping the
   `altint_on` FRAMES spin (`$40EB`), so SLOW/NMI display + `main`/`getk` run.
4. Forces `RETRO_DEVICE_JOYPAD` each frame; maps joypad `auto` like cursor defaults.
5. Does **not** overwrite pinned `81-wasm.data` from EmulatorJS 4.2.3.

## Upstream

| Item | Value |
| --- | --- |
| Source | `EmulatorJS/81-libretro` |
| Revision | `86decf3ee61ea5803972948e80197bee8474796b` |
| License | GPL-3.0 (EightyOne / 81-libretro); ZX81 firmware embedded — no separate Sinclair ROM files |
| Patch | `scripts/patches/81_eo/0001-rbg-eo-loadp-crt-autostart-joypad.patch` |
| Toolchain | Docker `emscripten/emsdk:3.1.74` + `EmulatorJS/build` `build.sh -c=81` then rename to `81_eo` |
| `minimumEJSVersion` | `4.2.2` (embedded `build.json`) |

## Artifacts (locked)

| File | SHA-256 | Bytes |
| --- | --- | --- |
| `apps/web/public/cores/ejs-4.2.3/cores/81_eo-wasm.data` | `ae43580d89f1b69f0b04cf2788efb475b51bd4a2c47bc4ab15b1ba25963604de` | 741474 |
| `apps/web/public/cores/ejs-4.2.3/cores/81_eo-legacy-wasm.data` | `75d445ac4dbf930e3a0c5bd0546ce8f6e530171d9fefab1ea18c34687a492789` | 741692 |
| `apps/web/public/cores/ejs-4.2.3/cores/reports/81_eo.json` | `e7e283928c8a36154c66c23415a9fc779c8c90441a3d19713889ed1ea1f16760` | 199 |

## Gameplay status — VERIFIED_PLAYABLE (2026-10-29)

| Gate | Result |
| --- | --- |
| Chromium smoke | `ZX81_GAMEPLAY_PASS` — MIT Dot, keyboard 5/8 move, hold-`8` capture |
| Save/load | `stateBytes=49216`, restore observed |
| Native xy harness | `x: 15→31→0` with lit framebuffer + NMI (`native-dotmove.txt`) |
| Stock `81` package | Unchanged |
| EJS RetroPad `simulateInput` | **Known gap** — inert for keybovl; keyboard path proven (player maps digits) |

Evidence: `.runtime/test-evidence/PH-12/zx81/` (+ smoke screenshot also under `PH-05/screenshots/zx81-gameplay.png`).

## Fixture

First-party MIT Dot: `.fixtures/mit-zx81-dot.p` from `fixtures/zx81-dot/dot.c` (z88dk `+zx81`).
