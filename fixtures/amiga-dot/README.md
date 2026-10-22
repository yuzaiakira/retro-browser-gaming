# Amiga Dot (first-party MIT)

Joystick-driven color block for Amiga 500-class systems. Built for Retro Browser
Gaming engineering acceptance with EmulatorJS `puae` and AROS Kickstart fallback
(no proprietary Kickstart redistributed).

## Build

Requires Docker images:

- `amigadev/crosstools:m68k-amigaos` (compile)
- `python:3.12-slim` + `amitools` (ADF packing)

```bash
docker run --rm -v "$PWD:/src" -w /src amigadev/crosstools:m68k-amigaos \
  bash -lc 'export PATH=/opt/m68k-amigaos/bin:$PATH; make'

mkdir -p build
docker run --rm -v "$PWD:/work" -w /work python:3.12-slim bash -lc '
  pip install -q amitools
  xdftool build/mit-amiga-dot.adf create size=dd + format "AmigaDot" ofs + boot install + \
    makedir s + write Startup-Sequence s/Startup-Sequence + write AmigaDot AmigaDot
'
```

SHA-256 of the tracked fixture is recorded in `docs/licenses-and-assets.md`.
