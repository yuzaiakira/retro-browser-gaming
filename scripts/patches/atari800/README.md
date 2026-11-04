# libretro-atari800 patches (Retro Browser Gaming)

## Pin

| Item | Value |
|------|-------|
| Upstream | https://github.com/libretro/libretro-atari800 |
| Commit | `4e7fbc73765c1a9670c7506616046ad1d4ccda51` |
| License | GPL-2.0 (Atari800) + FSF all-permissive AltirraOS/BASIC |
| Toolchain | `emscripten/emsdk:3.1.74` + EmulatorJS/build `677b1334…` |

## Patches

1. `0001-rbg-memstream-retroarch-abi.patch` — align savestate `memstream_*`
   with EmulatorJS RetroArch (`memstream_set_buffer` + 1-arg `memstream_open`).
   Without this, `retro_serialize` aborts (`RuntimeError: unreachable`).
