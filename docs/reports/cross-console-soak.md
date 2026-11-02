# Cross-console long-session soak (PH-12)

Date: 2026-11-02  
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

Internal lifecycle checkpoints (diagnostics only — not certification markers):

`CATALOG_READY` → `DOWNLOAD_COMPLETED` → `INSTALL_VERIFIED` → `RUNTIME_READY` → `PLAYER_CONTROLS_READY` → `GAMEPLAY_CONFIRMED` → `SAVE_RESTORE_CONFIRMED` → `RUNTIME_DISPOSED`

## Platforms

| Platform | Slug | Included when |
|----------|------|----------------|
| Genesis | `mit-genesis-breakout` | catalog present |
| NES | `mit-nes-table-tennis` | catalog present |
| N64 | `mit-n64-controller-test` | catalog present |
| ZX81 | `mit-zx81-dot` | catalog present |
| Atari ST | `gpl-atari-st-pongwars` | catalog present |
| Atari 8-bit | `mit-atari8-dot` | catalog present |
| FDS | `mit-fds-move-demo` | catalog present (+ OpenDiskSysROM IDB seed) |
| Dreamcast | `mit-dreamcast-dot` | catalog present |
| PSP | `mit-psp-dot` | catalog present |
| Flash/Ruffle | `mit-flash-dot` | catalog present |
| Arcade | `mit-arcade-rbgdot` | `SOAK_INCLUDE_ARCADE=1` **and** runnable |

Mandatory platforms that soft-skip fail the soak when `SOAK_FAIL_ON_SKIP=1` (default). Disabled Menu is never treated as success.

## EXIT=137

Historical SIGKILL/OOM evidence is preserved from  
`.runtime/test-evidence/PH-12/flash/baseline-genesis-exit137.json`  
into the soak evidence directory when present.

## Acceptance

- **`CROSS_CONSOLE_SOAK_PASS`**: ≥2 platforms OK + zero hard disposal failures  
- **`CROSS_CONSOLE_SOAK_FULL_PASS`**: all ten required keys OK (**skipped ≠ pass**)

## Status (2026-11-02)

**`CROSS_CONSOLE_SOAK_FULL_PASS`** (historical, may include prior hot-deployed web chunks) and  
**`CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS`** — same 10/10 matrix on **freshly built** Compose `api`/`web` images after BuildKit secret fix + path-scoped CSP (no host `.next` bind).  
`SOAK_CYCLES=2`, `SOAK_PLAY_SECONDS=10`, OpenDiskSysROM seeded (`6ce74ea4…`).

| Platform | Result | Notes (first cycle) |
|----------|--------|---------------------|
| Genesis | OK | CATALOG ~259 ms; DOWNLOAD ~1312 ms; Menu ~616 ms; iframeAfter=0 |
| NES | OK | CATALOG ~120 ms; DOWNLOAD ~807 ms; Menu ~551 ms; iframeAfter=0 |
| N64 | OK | CATALOG ~118 ms; DOWNLOAD ~1310 ms; Menu ~837 ms; iframeAfter=0 |
| ZX81 | OK | Integrity restored for rebuilt `81_eo` (`09c7afa9…` / report `04c8b1f9…`); Menu ~471 ms |
| Atari ST | OK | Menu ~5202 ms (Hatari cold); iframeAfter=0 |
| Atari 8-bit | OK | Menu ~471 ms; iframeAfter=0 |
| FDS | OK | Harness seeds OpenDiskSysROM into `rbg-user-bios`; Menu ~536 ms |
| Dreamcast | OK | Menu ~852 ms; iframeAfter=0 |
| PSP | OK | Menu ~1202 ms; iframeAfter=0 |
| Flash | OK | Menu ~484 ms; save N/A (`saveState=false`); iframeAfter=0 |

Evidence: `.runtime/test-evidence/PH-12/soak/cross-console-soak.json`, `cross-console-soak-clean-build.json`, `CROSS_CONSOLE_SOAK_FULL_PASS.txt`, `CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS.txt`, `COMPOSE_CLEAN_REBUILD_PASS.txt`, `lifecycle/*.json`, `clean-build-soak2.log`.  
Related: `docs/reports/compose-rebuild-verification.md`, `docs/reports/runtime-csp-audit.md`.

### ZX81 soak failure root cause (resolved)

**Class D — Incorrect core package lock / provision mismatch**, then report-JSON sync gap:

1. Private `81_eo` bytes were rebuilt (`09c7afa9…`) while API `licensed_asset_manifest` still expected prior lock `2ddbd03b…` / report `9436baf5…` → `CORE_INTEGRITY_FAILED` during download.
2. `reports/81_eo.json` was not on the browser allowlist, so LOCAL_FULL sync did not refresh it in the web container.
3. Fix: rebuild stamped to EJS `minimumEJSVersion` 4.2.2; update `docs/core-package-lock.json` + allowlist + re-`seed_demo`; add report path to allowlist; reseed EmulatorCore manifests from lock.

### FDS soak failure root cause (resolved)

**Class L — Test harness synchronization defect** (missing BIOS seed):

- Independent FDS gameplay was already VERIFIED_PLAYABLE, but the soak profile never imported OpenDiskSysROM into IndexedDB `rbg-user-bios`.
- Fix: harness seeds/validates BIOS (`6ce74ea4…`, 8192 B) once per browser profile before FDS; fail closed if seed missing.

### Harness reliability

- Observable checkpoints with bounded timeouts; actionable failure reasons + lifecycle JSON.
- `SOAK_FAIL_ON_SKIP` default on; `SOAK_PLATFORM_FILTER` for focused runs.
- Sequential cycles; pending RPC cancellation / disposal asserted via iframe count + session attribute.
- Measurement limitations recorded in evidence `limitations` (RSS often unavailable; WASM growth inside iframes not parent-visible; checkpoints are diagnostics only).

## Arcade regression (same session)

Stale web image lacked `mame_rbg_arcade` in the client registry (`UNSUPPORTED_CORE`). Host rebuild + runtime CSP for `/runtime/*` (`wasm-unsafe-eval` + `unsafe-inline` for Emscripten glue) restored:

- `ARCADE_RBGDOT_GAMEPLAY_PASS`
- `ARCADE_RBGDOT_SAVE_RESTORE_PASS`
- `ARCADE_RBGDOT_OFFLINE_PWA_PASS` (post-repair offline re-boot remains soft)

Product approval **PENDING**. OS PWA / physical **NOT_VERIFIED**. Other MAME drivers **NOT_VERIFIED**. FBNeo **NO-GO**.
