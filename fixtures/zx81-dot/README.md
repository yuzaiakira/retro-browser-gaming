# ZX81 Dot (first-party MIT)

Keyboard/cursor-driven character for Sinclair ZX81 (16K). Built for Retro Browser
Gaming engineering acceptance with EmulatorJS `81` (81-libretro / EightyOne).

Controls: ZX81 cursor keys `5`/`6`/`7`/`8` and `O`/`P`/`Q`/`A`. The 81-libretro
RetroPad maps the D-Pad to those cursor keys.

## Build

Requires Docker image `z88dk/z88dk`.

```bash
docker run --rm -v "$PWD:/src" -w /src z88dk/z88dk:latest \
  zcc +zx81 -clib=default -create-app -O2 -o mit-zx81-dot dot.c
cp mit-zx81-dot.P ../../.fixtures/mit-zx81-dot.p
```

SHA-256 of the tracked fixture is recorded in `docs/licenses-and-assets.md`.
