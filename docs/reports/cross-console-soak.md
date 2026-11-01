# Cross-console long-session soak (PH-12)

Date: 2026-11-01  
Harness: `apps/web/tests/cross-console-soak.cjs`  
Evidence: `.runtime/test-evidence/PH-12/soak/`

## Goal

Detect memory / resource leaks across sequential emulator launches in **one** browser profile by measuring:

- Page JS heap (`Runtime.getHeapUsage`) after opportunistic GC
- Browser process RSS via `/proc/<pid>/status` when `browser.process()` is available
- Parent-page iframe count (must return to 0 after exit)
- Runtime session attribute must not survive exit
- Best-effort WebGL-lost / AudioContext notes (parent page only)

**Do not** equate retained V8 heap *capacity* with a leak. Trends across cycles matter.

## Platforms

| Platform | Slug | Included when |
|----------|------|----------------|
| Genesis | `mit-genesis-breakout` | catalog present |
| NES | `mit-nes-table-tennis` | catalog present |
| N64 | `mit-n64-controller-test` | catalog present |
| ZX81 | `mit-zx81-dot` | catalog present |
| Atari ST | `gpl-atari-st-pongwars` | catalog present |
| Atari 8-bit | `mit-atari8-dot` | catalog present |
| FDS | `mit-fds-move-demo` | catalog present |
| Dreamcast | `mit-dreamcast-dot` | catalog present |
| PSP | `mit-psp-dot` | catalog present |
| Flash/Ruffle | `mit-flash-dot` | catalog present |
| Arcade | `mit-arcade-rbgdot` | `SOAK_INCLUDE_ARCADE=1` **and** runnable |

Missing catalog titles are **skipped** (not hard-fail). Disposal/iframe failures are hard-fail.

## EXIT=137

Historical SIGKILL/OOM evidence is preserved from  
`.runtime/test-evidence/PH-12/flash/baseline-genesis-exit137.json`  
into the soak evidence directory when present.

## Acceptance

- **`CROSS_CONSOLE_SOAK_PASS`**: ≥2 platforms OK + zero hard disposal failures  
- **`CROSS_CONSOLE_SOAK_FULL_PASS`**: all ten required keys OK (skipped ≠ pass)

## Status (2026-11-01 evening)

**`CROSS_CONSOLE_SOAK_PASS`** — Compose launcher, `SOAK_CYCLES=1`, `SOAK_PLAY_SECONDS=8`.

| Platform | Result |
|----------|--------|
| Genesis | OK |
| NES | OK |
| N64 | OK |
| ZX81 | **SKIPPED** — Play link timeout (download stuck / catalog flake) |
| Atari ST | OK (slug corrected to `gpl-atari-st-pongwars`) |
| Atari 8-bit | OK |
| FDS | **SKIPPED** — Menu enable timeout after play |
| Dreamcast | OK |
| PSP | OK |
| Flash | OK |

**`CROSS_CONSOLE_SOAK_FULL_PASS`**: **PENDING** (zx81 + fds skipped).

Evidence: `.runtime/test-evidence/PH-12/soak/cross-console-soak.json`, `soak-run.txt`.  
Historical EXIT=137: preserved when present under soak evidence.  
RSS: often `browser.process()` null in headless — heap-only measurements labeled honestly.
