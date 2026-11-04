# Atari 8-bit — libretro-atari800 WASM build (PH-12.3)

Date: 2026-10-31. Core id: **`atari800`** (never overwrites `a5200`).

## Pins

| Item | Value |
|------|-------|
| libretro-atari800 | `4e7fbc73765c1a9670c7506616046ad1d4ccda51` |
| Bundled Atari800 | 7.0.0 |
| EmulatorJS/build | `677b1334ab1721a1e31b918f211b68f4e54f67a8` |
| emsdk image | `emscripten/emsdk:3.1.74` |
| Firmware | AltirraOS + Altirra BASIC (FSF all-permissive) — see `atari8-firmware-audit.md` |
| Default machine | `800XL (64K)` via `EJS_defaultOptions` |
| Content path | Seekable VFS (`needs_fullpath=true`); no blob-only shortcut |

## Build

```bash
# Optional: SEED_COMPILE=/tmp/vecx-ejs-build2/compile to reuse RetroArch/EmulatorJS trees
WORK=/tmp/atari800-ejs-build bash scripts/build-atari800-emscripten.sh
```

Outputs (SHA-256 filled after successful build):

| Package | SHA-256 | Bytes |
|---------|---------|-------|
| `atari800-wasm.data` | `6d19d00650e8cad472fd0d9654810e11ce1a04bb4d3460fa0219d8e632a7b777` | 830097 |
| `atari800-legacy-wasm.data` | `b7b6664b83fee853bf6ccbd42592b928ac9094348d30510b7ed53841030d484d` | 829725 |

Install into `apps/web/public/cores/ejs-4.2.3/cores/` and
`.private-runtime/cores/ejs-4.2.3/cores/`, then refresh:

- `docs/core-package-lock.json`
- `docs/open-source/browser-distributable-allowlist.json` (+ web copies)
- `docs/open-source/private-core-binaries.manifest.json`

## Runtime profile (`frame.js`)

- `atari800_system` = `800XL (64K)`
- `atari800_os_xl` = `AltirraOS`
- `atari800_basic_version` = `Altirra BASIC`
- `atari800_internalbasic` = `disabled`
- `webgl2Enabled` = `disabled` (prefer software framebuffer)
- Control scheme: `atari2600` (joystick + fire layout)
- Extensions phase 1: `.xex`, `.atr` (`.car`/`.cas`/multi-disk after validation)

## Fixture

`.fixtures/mit-atari8-dot.xex` — first-party MIT Dot
(`scripts/build-atari8-dot-fixture.py`).

## Evidence

`.runtime/test-evidence/PH-12/atari8/` — markers:

- `ATARI8_GAMEPLAY_PASS`
- `ATARI8_SAVE_RESTORE_PASS` (save ~188768 B after memstream patch)
- `ATARI8_OFFLINE_PWA_PASS`

Fixture SHA-256: `bd52416d2d76201b3aa6c442eb197b338f3cd567fab2865a13aae0a12d81e16c`

Engineering status: **VERIFIED_PLAYABLE**. Product approval **pending**. OS PWA / physical **NOT_VERIFIED**.

## EmulatorJS compatibility

Packaged `build.json` sets `minimumEJSVersion` to **4.2.3** to match the pinned runtime (upstream EmulatorJS/build defaults to 4.3.0).

## Savestate patch

`scripts/patches/atari800/0001-rbg-memstream-retroarch-abi.patch` aligns `memstream_*` with EmulatorJS RetroArch (fixes `RuntimeError: unreachable` on save).
