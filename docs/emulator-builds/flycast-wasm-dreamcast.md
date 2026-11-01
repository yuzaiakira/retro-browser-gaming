# Flycast WASM — Dreamcast feasibility (PH-12.5)

Date: 2026-11-01. Status: **VERIFIED_PLAYABLE (engineering)** — product approval pending; OS PWA / physical devices NOT_VERIFIED.
Core id: **`flycast`** (never overwrite existing cores).

## Pins

| Item | Value |
|------|-------|
| Flycast WASM release | **v1.0** tag `16e9c7b4b7065a4bd42e7490e8aab3e9283d5415` |
| Upstream Flycast | `flyinghead/flycast` **`2c48c01`** (+ `wasm-jit-phase1-modified.patch` + `rec_wasm.cpp` tree) |
| License | **GPLv2** (`LICENSE` in nasomers/flycast-wasm; inherited from Flycast) |
| Toolchain (upstream build) | Emscripten **3.1.74+**, CMake `LIBRETRO=ON`, `USE_GLES=ON`, WebGL2 (`MIN/MAX_WEBGL_VERSION=2`) |
| EmulatorJS packaging | Release ships **raw** `flycast_libretro.js` + `.wasm` with `EXPORT_NAME=EJS_Runtime` — packaged here as EJS 4.2.3 `.data` |
| Local package version | **`1.0.2-rbg-libelf-js`** |

## Release artifact SHA-256 (downloaded 2026-11-01)

| File | Bytes | SHA-256 |
|------|------:|---------|
| `flycast_libretro.wasm` | 10398725 | `db2b87d8d2742087a56c4eeed317da14e3549ee037e36de3d77c1e6e5291bead` |
| `flycast_libretro.js` (upstream) | 312644 | `1f2ae9afafa85c8ff577ca3961be0343c2ac394ddc79285981f0d55ad75dbd7b` |

### EmulatorJS 4.2.3 packaging (this repo)

7z `.data` packages (LZMA2) under `ejs-4.2.3/cores/` + private-runtime. JS glue includes RBG local modifications; **wasm bytes unchanged** from nasomers v1.0.

| Package | Bytes | SHA-256 |
|---------|------:|---------|
| `flycast-wasm.data` | 3430469 | `5ef913f5692e41bd6c8ffe1e501470784bacec7c66ba7cb270d7b1474fca099e` |
| `flycast-legacy-wasm.data` | 3430469 | same |

#### Local JS modifications (documented; wasm pin preserved)

Upstream v1.0 linked with `-sWARN_ON_UNDEFINED_SYMBOLS=0`, so several imports were abort stubs:

1. **libelf JS polyfill** — `elf_newFile` + program-header accessors (BSD-2-Clause API from `core/deps/libelf`; required for REIOS `.elf` homebrew).
2. **Soft-stubs** — `zip_*`, `chdstream_*`, miniupnpc → return `0` (non-archive / non-CHD / non-netplay paths).
3. Frame adapter (`frame.js`): canvas prime (non-zero size before `callMain`), WebGL `getParameter` GLES3 strings + `INVALID_ENUM` swallow, `preserveDrawingBuffer`, `reicast_hle_bios=enabled`, **`reicast_emulate_framebuffer=enabled`** (required for `vram_s` 2D homebrew such as Dot).

Reproducible upstream rebuild: `build-prod.sh` against Flycast `2c48c01` + patches with a local EmulatorJS RetroArch tree (`EJS_RA`), then re-apply the JS polyfill/soft-stubs when packaging.

## Browser requirements

| Capability | Required | Notes vs RBG stack |
|------------|----------|--------------------|
| WebAssembly | Yes | Present |
| WebGL2 | Yes | `FULL_ES3=1`; Chromium smoke uses `--enable-unsafe-swiftshader` |
| Cross-origin isolation (COOP/COEP) | Yes | Launcher already sets `same-origin` / `require-corp` |
| Dynamic `WebAssembly.compile` | Yes (JIT) | Frame CSP includes `'unsafe-eval'` |
| Memory | High | `INITIAL_MEMORY=256MiB` + growth — disc media must stay seekable/OPFS |
| AudioWorklet | Yes | Present in port |
| SharedArrayBuffer / threads | Optional | `EJS_threads=false` for Flycast |

## Chromium evidence (2026-11-01)

Command: `CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/dreamcast-hle-smoke.cjs`

| Marker | Result |
|--------|--------|
| HLE boot (no `dc_boot.bin` / `dc_flash.bin`) | **`DREAMCAST_HLE_BOOT_VISIBLE`** (REIOS + Dot) |
| Interactive Left/Right + frames | **`DREAMCAST_GAMEPLAY_PASS`** |
| A button (RetroPad B=`0`) | fire pixels observed |
| Save → move → restore | **`DREAMCAST_SAVE_RESTORE_PASS`** (~28 MiB state) |
| Compose offline PWA | **`DREAMCAST_OFFLINE_PWA_PASS`** (SW offline; library cold-start; restore+save; no server deps) |

Evidence: `.runtime/test-evidence/PH-12/dreamcast/` (`offline-pwa-journey.json`, screenshots).

## Fixture

| Item | Value |
|------|-------|
| MIT Dot ELF | `.fixtures/mit-dreamcast-dot.elf` |
| SHA-256 | `ffafb5d50a89c0c8077ec2cbfe80ff82306d7f8bec8d7e98e9eaf7c213f0608e` |
| SDK | KallistiOS Docker rebuild via `scripts/build-dreamcast-dot-fixture.sh` |

## Follow-ups (non-blocking for engineering VERIFIED_PLAYABLE)

1. Prefer seekable/OPFS for large CHD/GDI/CDI; keep ELF for compact engineering boots.
2. Optionally rebuild upstream with real libelf/libzip linked (remove JS polyfill/soft-stubs).
3. Product approval + OS-level PWA / physical device gates remain open.
4. Allowlist: `LOCAL_ONLY` until counsel clears anonymous public CDN distribution of the modified Flycast pack.
