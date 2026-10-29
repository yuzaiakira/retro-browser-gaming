# PH-12.1 — Nintendo 64 (`mupen64plus_next`) gameplay

**Date:** 2026-10-29
**Branch:** `feat/platform-expansion-phase-1`
**Status:** VERIFIED_PLAYABLE (Chromium engineering acceptance)

## Core

| Field | Value |
| --- | --- |
| Core | `mupen64plus_next` (EmulatorJS 4.2.3) |
| Package | `ejs-4.2.3/cores/mupen64plus_next-wasm.data` |
| SHA-256 | `2da1cbce9fda395e3ae83ca5787353baa159142d45ef3ea90f108b92524f76cc` |
| License | GPL-2.0-or-later / Mupen64Plus NX notices; EmulatorJS packaging GPL-3.0 |
| Source pin | EmulatorJS `e150dc0491ae747028919fb82d6598954976ede6` / CDN 4.2.3 |
| Control scheme | `n64` (A=0, B=1, Start=3, D-Pad 4–7, stick 16–19 ±0x7fff) |
| Capabilities | saveState, audio, analog; blob VFS (not seekable) |

## Legal fixture

| Field | Value |
| --- | --- |
| File | `.fixtures/mit-n64-controller-test.z64` |
| SHA-256 | `6b042a945797401b2fb4f6dea11ace65ea07ebf6557830b7bda665826a0a2b2b` |
| Upstream | `Ryzee119/n64_controller_test` release `build-202008190836` |
| License | MIT (`LICENSES/n64-controller-test-MIT.txt`) |

## Root cause of prior EXPERIMENTAL status

The USB64 controller-test ROM only paints **live** controller state. The previous smoke harness released stick/A before capturing the frame, so hashes matched the neutral boot HUD even when `simulateInput` worked. Hold-while-capture proves Cont 0 `A=1` and stick `x:80`.

## Verification commands

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium PLATFORM=n64 node apps/web/tests/libretro-family-smoke.cjs
# Diagnostic (optional):
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/n64-input-diag.cjs
```

## Results (2026-10-29)

| Gate | Result |
| --- | --- |
| Boot / non-black FB | PASS (`lit≈49292`) |
| Interactive input (held stick+A) | `N64_GAMEPLAY_PASS` (`inputChangedFrame=true`) |
| Offline after boot | PASS (Playwright `setOffline(true)`) |
| Save / load | PASS (`stateBytes=16793440`; restore hash matched held frame) |
| Vitest / typecheck | 68 passed / `tsc --noEmit` OK |

Evidence (Git-ignored): `.runtime/test-evidence/PH-12/n64/` and `PH-05/screenshots/n64-gameplay.png`.

## Known limitations (honest)

- ROMs **> 64 MiB** abort under the pinned mupen WASM build; `frame.js` now returns `N64_ROM_TOO_LARGE` instead of a cryptic WASM OOM.
- Some homebrew that requests atypical huge RDRAM allocations (historically N64brew GameJam) can still fail WASM memory growth — not claimed playable.
- Physical gamepad / iOS Safari / staging HTTPS remain **NOT_VERIFIED** (same as other consoles).
- Catalog seed is engineering-only (`mit-n64-controller-test`); product approval is separate.
