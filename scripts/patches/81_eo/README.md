# 81_eo patches (EightyOne / EmulatorJS)

Upstream: `EmulatorJS/81-libretro` @ `86decf3ee61ea5803972948e80197bee8474796b`  
License: GPL-3.0 (EightyOne / 81-libretro). Stock EmulatorJS `81-*.data` packages are **not** modified.

## Patch

`0001-rbg-eo-loadp-crt-autostart-joypad.patch`

1. `.p` loads via `eo_loadp` (`.tzx`/`.t81` keep FlashLoad).
2. z88dk CRT autostart at `$4092` with CDFLAG bit6 clear + altint FRAMES-wait skip.
3. Joypad force to `RETRO_DEVICE_JOYPAD` each frame (EmulatorJS may leave NONE).
4. Joypad `auto` maps like `default` (cursor keys 5/6/7/8) instead of dead joymap 0.

## Rebuild

```bash
# Host: EmulatorJS/build tree + patched 81-libretro (see docs/emulator-builds/zx81-eo-loadp-build.md)
docker run --rm -v "$PWD/build:/work" -v "$PWD/81-libretro-patched:/patched:ro" \
  emscripten/emsdk:3.1.74 bash /path/to/rebuild-81-eo.sh
```

Install outputs as `apps/web/public/cores/ejs-4.2.3/cores/81_eo-*.data` and refresh `docs/core-package-lock.json`.
