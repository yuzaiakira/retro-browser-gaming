# Flycast WASM — Dreamcast feasibility (PH-12.5)

Date: 2026-11-01. Status: **EXPERIMENTAL** (integration in progress).  
Core id candidate: **`flycast`** (never overwrite existing cores).

## Pins

| Item | Value |
|------|-------|
| Flycast WASM release | **v1.0** tag `16e9c7b4b7065a4bd42e7490e8aab3e9283d5415` |
| Upstream Flycast | `flyinghead/flycast` **`2c48c01`** (+ `wasm-jit-phase1-modified.patch` + `rec_wasm.cpp` tree) |
| License | **GPLv2** (`LICENSE` in nasomers/flycast-wasm; inherited from Flycast) |
| Toolchain (upstream build) | Emscripten **3.1.74+**, CMake `LIBRETRO=ON`, `USE_GLES=ON`, WebGL2 (`MIN/MAX_WEBGL_VERSION=2`) |
| EmulatorJS packaging | Release ships **raw** `flycast_libretro.js` + `.wasm` with `EXPORT_NAME=EJS_Runtime` — **not** a stock EmulatorJS 4.2.3 CDN `.data` core |
| Sample core options | `config/dreamcast-core-options.json` |

## Release artifact SHA-256 (downloaded 2026-11-01)

| File | Bytes | SHA-256 |
|------|------:|---------|
| `flycast_libretro.wasm` | 10398725 | `db2b87d8d2742087a56c4eeed317da14e3549ee037e36de3d77c1e6e5291bead` |
| `flycast_libretro.js` | 312644 | `1f2ae9afafa85c8ff577ca3961be0343c2ac394ddc79285981f0d55ad75dbd7b` |

Reproducible rebuild: follow `build-prod.sh` against Flycast `2c48c01` + patches; requires a local EmulatorJS RetroArch emscripten object tree (`EJS_RA`).

## Browser requirements (from port + write-up)

| Capability | Required | Notes vs RBG stack |
|------------|----------|--------------------|
| WebAssembly | Yes | Present |
| WebGL2 | Yes | `FULL_ES3=1`; already gated in compatibility probe for `flycast_wasm` |
| Cross-origin isolation (COOP/COEP) | Yes | Launcher already sets `same-origin` / `require-corp` |
| Dynamic `WebAssembly.compile` | Yes (JIT) | Needs CSP that allows wasm compile; frame CSP currently includes `'unsafe-eval'` |
| Memory | High | Link uses `INITIAL_MEMORY=256MiB` + growth — disc media must stay seekable/OPFS; do not Blob-copy entire CHD |
| AudioWorklet | Yes | Custom ring in patch set |
| SharedArrayBuffer / threads | Declared in probe as `threads` for future core | Isolation headers already present |

## EmulatorJS 4.2.3 compatibility

- Dreamcast is **not** in EmulatorJS 4.2.3 stock `getCores`.
- v1.0 is an EmulatorJS-**style** libretro module (`EJS_Runtime`), not a drop-in locked `.data` package.
- Integration must be a **dedicated** versioned adapter/frame path (similar spirit to Hatari), without modifying verified cores.
- Packaging into this repo’s private-runtime + core-lock is required before catalog seeding.

## Savestate claim

`config/core.json` advertises `"save":"state"`. Treat as **unproven** until `DREAMCAST_SAVE_RESTORE_PASS` on this exact WASM binary.

## Next engineering steps

1. Prove HLE boot of a legal homebrew ELF/CDI with `reicast_hle_bios=enabled` (see firmware audit).
2. Package reproducible artifacts into private-runtime + lock/allowlist.
3. Seekable/OPFS media path for CHD/GDI/CDI; compact ELF preferred for first fixture.
4. Chromium A/B/A gameplay → save → Compose offline PWA gates.
