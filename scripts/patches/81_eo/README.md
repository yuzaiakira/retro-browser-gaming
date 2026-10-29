# 81_eo patches (EightyOne / EmulatorJS)

Upstream: `EmulatorJS/81-libretro` @ `86decf3ee61ea5803972948e80197bee8474796b`  
License: GPL-3.0 (EightyOne / 81-libretro). Stock EmulatorJS `81-*.data` packages are **not** modified.

## Patch

`0001-rbg-eo-loadp-crt-autostart-joypad.patch`

1. `.p` loads via `eo_loadp` (`.tzx`/`.t81` keep FlashLoad).
2. z88dk CRT autostart at `$4092` with CDFLAG bit6 clear + altint FRAMES-wait skip.
3. Joypad force to `RETRO_DEVICE_JOYPAD` each frame (EmulatorJS may leave NONE).
4. Joypad `auto` maps like `default` (cursor keys 5/6/7/8) instead of dead joymap 0.
5. keybovl reads `RETRO_DEVICE_ID_JOYPAD_MASK` (256) so per-id `binds.valid` gating is bypassed at the core — browser `simulate_input` still does not move Dot; player uses `apps/web/public/runtime/frame.js` RetroPad→Digit bridge.

## Rebuild

See `docs/emulator-builds/zx81-eo-loadp-build.md` for pinned SHA-256 of shipped `81_eo-*.data` and the Docker/emsdk recipe.

Install outputs as `apps/web/public/cores/ejs-4.2.3/cores/81_eo-*.data` and refresh `docs/core-package-lock.json`.

## Publication

Patch + build notes constitute corresponding-source material for the modified binary. Product browser redistribution remains **NOT_CLEARED** until legal review (`docs/open-source/not-cleared-cores.md`). Do not claim counsel approval from this README.
