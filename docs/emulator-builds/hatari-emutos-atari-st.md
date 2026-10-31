# Atari ST — Hatari 2.6.1 + EmuTOS (PH-12.3)

## Pins

| Component | Revision | Notes |
|-----------|----------|-------|
| Hatari | `6a8e26d69fb32d61efd398dc1ad9a77122400034` (tag **v2.6.1**) | Upstream https://github.com/hatari/hatari |
| EmuTOS | `02c2db75fc875265c1449efea014450466cf20b7` (1.4.0-dev tree; `etos256us.img`) | Built with `claunia/cross-m68k-atarist-mint` (GCC 4.6.4 MiNT); `make 256 UNIQUE=us` |
| Emscripten | `emscripten/emsdk:4.0.4` | Matches Hatari GitLab `build-emscripten` job |
| Fixture | neilrackett/atarist-pongwars **v2.0.0** `PONGWARS.ST` | GPL-3.0; sha256 `2c5ca8e161bec25ccb2a96452b837420b145538f67fa4e31c8075f204bbee99c` |

## Licenses / firmware

- Hatari: GPL-2.0 (`LICENSES/hatari-GPL-2.0.txt`).
- EmuTOS: GPL-2.0 (`LICENSES/emutos-GPL-2.0.txt`). Preloaded as `tos.img` inside `hatari.data` (sha256 `2d6f3f94c212d1d9eb5b9ad913400d934a0fdf56924a7e2c51ff70e27b561b55`, identical to built `etos256us.img`).
- **No proprietary Atari TOS** is distributed.
- Pong Wars: GPL-3.0 (`LICENSES/atari-st-pongwars-GPL-3.0.txt`).

## Build (reproducible)

```bash
# EmuTOS
git clone https://github.com/emutos/emutos && cd emutos
git checkout 02c2db75fc875265c1449efea014450466cf20b7
docker run --rm -v "$PWD":/src -w /src claunia/cross-m68k-atarist-mint \
  bash -lc 'make clean && make 256 UNIQUE=us -j$(nproc)'
# → etos256us.img

# Hatari WASM
git clone https://github.com/hatari/hatari && cd hatari
git checkout v2.6.1
mkdir -p build/files/fs
cp /path/to/etos256us.img build/files/tos.img
# Optional: patch src/emscripten.js so Module arguments honor globalThis.HATARI_ARGV
docker run --rm -v "$PWD":/src -w /src/build -u "$(id -u):$(id -g)" \
  emscripten/emsdk:4.0.4 \
  bash -lc 'emcmake cmake .. -DCMAKE_BUILD_TYPE=Release && cmake --build . -j$(nproc) --target hatari'
# → build/src/hatari.{js,wasm,data}
```

Runtime packaging: `apps/web/public/cores/hatari-2.6.1/hatari.js` (tracked) + private `.wasm`/`.data` provisioned like jsdos. Isolated frame: `/runtime/hatari-frame.{html,js}` (not EmulatorJS `FrameAdapter` path).

## Runtime behaviour

- Machine: `--machine st`, floppy `--disk-a /tmp/game.st`, keyboard joystick `-j 1`.
- Input: SDL keyboard/pointer; RetroPad mapped to Arrow keys + RCtrl fire.
- **Save/load:** `MemorySnapShot_Capture` / `Restore` are **not** in upstream Emscripten `EXPORTED_FUNCTIONS`. Frame reports `saveState: false` and rejects `save`/`load`. **Blocker** for full VERIFIED_PLAYABLE acceptance until exports + MEMFS round-trip are implemented and evidenced.

## Status (honest)

| Gate | Result |
|------|--------|
| Reproducible WASM + EmuTOS | Done (pins above) |
| Legal fixture | Done (GPL-3.0 Pong Wars) |
| Browser framebuffer / animation | Smoke `ATARI_ST_GAMEPLAY_PASS` when Chromium evidence recorded |
| Keyboard / pointer / RetroPad bridge | Implemented; RetroPad→keys verified as non-fatal dispatch in smoke |
| Save/load | **BLOCKED** (not exported) |
| Offline cold-start after boot | Smoke sets offline and re-checks framebuffer when `SKIP_OFFLINE` unset |
| Matrix checkbox VERIFIED_PLAYABLE | **No** while save/load (and product offline install journey) remain incomplete |

Evidence: `.runtime/test-evidence/PH-12/atari-st/` (or private archive) + this document.
