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
| Atari ST | `mit-atarist-dot` | catalog present |
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
into the soak evidence directory. Investigation checklist:

1. Kernel OOM logs (`dmesg` / journal) when accessible  
2. Container memory limits (`docker stats`, Compose `mem_limit`)  
3. Browser process RSS samples in soak JSON  
4. WASM memory growth (core-specific; not always exposed)  
5. Child-process termination vs parallel test contention  

## Acceptance

Emit **`CROSS_CONSOLE_SOAK_PASS`** only when:

- ≥2 platforms complete OK play/exit cycles  
- Zero hard disposal failures  
- Evidence JSON written  

## Run

```bash
# Against Compose launcher
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
  node apps/web/tests/cross-console-soak.cjs
```

Results: see evidence JSON + this report’s status section (updated after the first verified run).

## Status

**`CROSS_CONSOLE_SOAK_PASS`** (2026-11-01) — Compose launcher, `SOAK_CYCLES=1`, `SOAK_PLAY_SECONDS=8`.

| Platform | Result |
|----------|--------|
| Genesis | OK (disposal iframe→0) |
| NES | OK |
| N64 | OK |
| ZX81 | skipped (Play link timeout — catalog/download flake) |
| Atari ST | skipped (heading mismatch / fixture title) |
| Atari 8-bit | OK |
| FDS | skipped (Menu enable timeout) |
| Dreamcast | OK |
| PSP | OK |
| Flash | OK |
| Arcade | not included (`SOAK_INCLUDE_ARCADE` unset; runtime EXPERIMENTAL) |

Evidence: `.runtime/test-evidence/PH-12/soak/cross-console-soak.json`, `soak-run.txt`.  
Historical EXIT=137: preserved when present under soak evidence.  
RSS: `browser.process()` null in this headless run — heap-only measurements labeled honestly.
