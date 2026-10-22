# MSX Dot (first-party MIT)

Cursor/joystick-driven character for MSX (C-BIOS). Built for Retro Browser
Gaming engineering acceptance with EmulatorJS `bluemsx` and packaged C-BIOS
Machines (no proprietary MSX system ROMs redistributed).

Controls: cursor keys / joystick D-Pad move `O`; fire toggles `O`/`*`.

## Build

Requires Docker image `z88dk/z88dk`.

```bash
docker run --rm -v "$PWD:/src" -w /src z88dk/z88dk:latest \
  zcc +msx -subtype=rom -create-app -O2 -o mit-msx-dot dot.c
cp mit-msx-dot.rom ../../.fixtures/mit-msx-dot.rom
```

SHA-256 of the tracked fixture is recorded in `docs/licenses-and-assets.md`.
