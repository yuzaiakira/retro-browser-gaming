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
5. Uses `RETRO_DEVICE_ID_JOYPAD_MASK` in keybovl (binds.valid gating still leaves
   EmulatorJS `simulate_input` inert for Dot; player bridge is in `frame.js`).
6. Does **not** overwrite pinned `81-wasm.data` from EmulatorJS 4.2.3.

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
| `apps/web/public/cores/ejs-4.2.3/cores/81_eo-wasm.data` | `09c7afa97a99240a99ab9f5b074f8ff967a357cfd63e647126525b2bbe8fae81` | 740844 |
| `apps/web/public/cores/ejs-4.2.3/cores/81_eo-legacy-wasm.data` | `0ac838d27655b98aab10d1f6a152f158b030d04656bb7ba35c08eeb9539c76f7` | 740257 |
| `apps/web/public/cores/ejs-4.2.3/cores/reports/81_eo.json` | `04c8b1f9f95b9478b70ec45888f677c835f1dc93d1c13b5675c9f7dcd25f8c69` | 227 |

> 2026-11-02: private-store copy of prior lock `2ddbd03b…` was lost (stale
> `ce6f24ba…` from 2026-10-22 remained). Rebuilt via
> `scripts/build-81-eo-emscripten.sh` from the same patch/pins; Emscripten
> output is host-nondeterministic so digests differ. Gameplay must be
> re-proven after any rebuild.

## Rebuild (corresponding source)

```bash
# 1. Clone EmulatorJS/81-libretro @ 86decf3ee61ea5803972948e80197bee8474796b
# 2. Apply scripts/patches/81_eo/0001-rbg-eo-loadp-crt-autostart-joypad.patch
# 3. From EmulatorJS/build with emscripten/emsdk:3.1.74:
#      ./build.sh -c=81
# 4. Rename outputs to 81_eo-wasm.data / 81_eo-legacy-wasm.data
# 5. Install under apps/web/public/cores/ejs-4.2.3/cores/ and refresh
#      docs/core-package-lock.json (sha256 + byteSize must match table above)
```

Preferred-form patch + upstream pin are in-repo. **No legal publication approval is claimed** — counsel must still clear redistribution of the modified GPL binary (`docs/open-source/not-cleared-cores.md`).

## Gameplay status — VERIFIED_PLAYABLE (2026-10-29)

| Gate | Result |
| --- | --- |
| Chromium smoke | `ZX81_GAMEPLAY_PASS` — MIT Dot; RetroPad Left/Right via `frame.js` bridge; keyboard 5/8 retained |
| Save/load | `stateBytes=49216`, restore observed |
| Native xy harness | `x: 15→31→0` with lit framebuffer + NMI (`native-dotmove.txt`) |
| Stock `81` package | Unchanged |
| EJS `simulateInput` alone | Still inert for keybovl; **corrected** by core-specific RetroPad→Digit key inject on `.ejs_parent` |

Evidence: `.runtime/test-evidence/PH-12/zx81/` (+ `zx81-retropad-move.png`).

## Fixture

First-party MIT Dot: `.fixtures/mit-zx81-dot.p` from `fixtures/zx81-dot/dot.c` (z88dk `+zx81`).
