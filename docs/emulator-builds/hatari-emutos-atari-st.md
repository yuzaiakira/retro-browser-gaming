# Atari ST — Hatari 2.6.1 + EmuTOS (PH-12.3)

## Pins

| Component | Revision | Notes |
|-----------|----------|-------|
| Hatari | `6a8e26d69fb32d61efd398dc1ad9a77122400034` (tag **v2.6.1**) | Upstream https://github.com/hatari/hatari |
| EmuTOS | `02c2db75fc875265c1449efea014450466cf20b7` (1.4.0-dev tree; `etos256us.img`) | Built with `claunia/cross-m68k-atarist-mint` (GCC 4.6.4 MiNT); `make 256 UNIQUE=us` |
| Emscripten | `emscripten/emsdk:4.0.4` | Matches Hatari GitLab `build-emscripten` job |
| Fixture | neilrackett/atarist-pongwars **v2.0.0** `PONGWARS.ST` | GPL-3.0; sha256 `2c5ca8e161bec25ccb2a96452b837420b145538f67fa4e31c8075f204bbee99c` |
| Snapshot bridge | `scripts/patches/hatari-2.6.1/` | Deferred UAE `MemorySnapShot_Capture` / `Restore` + `rbg_hatari_snapshot_{save,restore,poll}` MEMFS bridge; RBGH v1 envelope in `hatari-frame.js` |

## Artifact SHA-256 (emsdk 4.0.4 rebuild)

| File | SHA-256 | Bytes |
|------|---------|-------|
| `hatari.js` | `7361f258a155e012378283c9bc8a914a2af78e51ceab84b59f981424d87f07bc` | 224201 |
| `hatari.wasm` | `cd5cec91bd5c759179c766e162629c1ae4eb6981d1490759e59f54ec19f31db4` | 23981938 |
| `hatari.data` (EmuTOS `tos.img` preload) | `2d6f3f94c212d1d9eb5b9ad913400d934a0fdf56924a7e2c51ff70e27b561b55` | 262144 |

## Licenses / firmware

- Hatari: GPL-2.0 (`LICENSES/hatari-GPL-2.0.txt`).
- EmuTOS: GPL-2.0 (`LICENSES/emutos-GPL-2.0.txt`). Preloaded as `tos.img` inside `hatari.data`.
- **No proprietary Atari TOS** is distributed.
- Pong Wars: GPL-3.0 (`LICENSES/atari-st-pongwars-GPL-3.0.txt`).
- Snapshot bridge C sources ship under Hatari GPL-2.0 terms with the patched tree.

## Build (reproducible)

```bash
# EmuTOS
git clone https://github.com/emutos/emutos && cd emutos
git checkout 02c2db75fc875265c1449efea014450466cf20b7
docker run --rm -v "$PWD":/src -w /src claunia/cross-m68k-atarist-mint \
  bash -lc 'make clean && make 256 UNIQUE=us -j$(nproc)'
# → etos256us.img

# Hatari WASM + RBG snapshot bridge
git clone https://github.com/hatari/hatari && cd hatari
git checkout v2.6.1
# Apply scripts/patches/hatari-2.6.1/ (emscripten.js ARGV, CMake exports,
# memorySnapShot LastError, emscripten_rbg_snapshot.c)
mkdir -p build/files/fs
cp /path/to/etos256us.img build/files/tos.img
docker run --rm -v "$PWD":/src -w /src/build -u "$(id -u):$(id -g)" \
  emscripten/emsdk:4.0.4 \
  bash -lc 'emcmake cmake .. -DCMAKE_BUILD_TYPE=Release && cmake --build . -j$(nproc) --target hatari'
# → build/src/hatari.{js,wasm,data}
```

Runtime packaging: `apps/web/public/cores/hatari-2.6.1/` + isolated `/runtime/hatari-frame.{html,js}`.

## Snapshot lifecycle

1. JS `command('save')` → RBGH envelope builder → `rbg_hatari_snapshot_save` (sets UAE `STATE_SAVE`).
2. Browser yields (`setTimeout` poll) so SDL/ASYNCIFY `m68k_run` reaches instruction boundary → `Capture_Do` → MEMFS `/tmp/rbg-hatari.snap`.
3. JS reads raw bytes, wraps RBGH v1 (core/EmuTOS/disk identity + raw SHA-256).
4. Load: validate envelope → write MEMFS → `rbg_hatari_snapshot_restore` (UAE `STATE_RESTORE` + quit/reset) → poll until idle.
5. Cleanup unlinks the temporary snap file. Overlapping ops rejected (`HATARI_SNAPSHOT_BUSY`).

**Root cause of earlier Immediate-path failure:** `Capture_Immediate` / `Restore_Immediate` from a browser event captured/restored mid-instruction; restore completed without `LastError` but left the machine rebooting into EmuTOS. Deferred UAE path fixes this. Nested `emscripten_sleep` inside `ccall` never advanced `m68k_run` (save `-3`); JS begin/poll does.

## Status (honest)

| Gate | Result |
|------|--------|
| Reproducible WASM + EmuTOS | Done (pins + hashes above) |
| Legal fixture | Done (GPL-3.0 Pong Wars) |
| Browser framebuffer / animation | `ATARI_ST_GAMEPLAY_PASS` — Chromium evidence |
| Keyboard / pointer / RetroPad bridge | Implemented; RetroPad→keys exercised in smoke |
| Save/load A→B→restore | **PASS** — `deltaRA=0`, corrupt rejected, cold reload restore lit; raw re-save SHA soft-mismatch (cycles/audio) |
| Offline after boot | Smoke sets offline and re-checks framebuffer |
| Full PWA offline cold-start install journey | **PASS** — `apps/web/tests/atari-st-offline-pwa.cjs` against Compose (`ATARI_ST_OFFLINE_PWA_PASS`); caches hatari.js/wasm/data + frames; OPFS game; offline restore/new-save/reload/cycles; partial wasm repair |
| OS-level PWA install / physical devices | **NOT_VERIFIED** (Playwright SW offline ≠ homescreen install ≠ Android/iOS) |
| Matrix checkbox VERIFIED_PLAYABLE | **Yes** (engineering) — product catalog approval remains **pending** |

Evidence: `.runtime/test-evidence/PH-12/atari-st/` + this document.
