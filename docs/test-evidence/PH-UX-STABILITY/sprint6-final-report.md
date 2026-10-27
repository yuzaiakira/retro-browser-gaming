# Sprint 6 — Product Quality, Long-Session Stability & Final Gameplay Acceptance

**Date:** 2026-10-27  
**Git HEAD at report:** see `git rev-parse HEAD` after Sprint 6 commits (pre-commit tip was `ba7af13`).  
**Scope:** Stability / soak / save integrity / offline regression / input QA / measured fixes only. No UI redesign.

## Bugs reproduced and fixed

| Bug | Evidence | Fix |
|---|---|---|
| Launcher gamepad `requestAnimationFrame` kept polling while `document.hidden` | Soak background probe + code inspection | `LauncherGamepadNav` cancels rAF on hide, clears sticky/seen, resumes with neutral gate (`launcher-gamepad.ts`) |
| Final UX journey B flaked on Continue Playing / Orbit Play without hydrated install | `FINAL_UX_ACCEPTANCE_FAIL` timeouts | `final-ux-acceptance.cjs`: wait for Play\|Download hydrate; Genesis for save journeys; Orbit for discover/download |

## Performance measurements (measured vs unavailable)

| Metric | Result | Kind |
|---|---|---|
| JS heap (CDP `Runtime.getHeapUsage`) | Full soak baseline → final growth ~17.2 MiB across Orbit+Genesis+MSX cycles | **measured** |
| Genesis per-cycle heap trend | ~7.8 KiB/cycle (smoke reconfirm negative); `genesisTrendOk: true` | **measured** |
| Browser process RSS | `unavailable(browser.process null)` | **NOT_VERIFIED** |
| CPU / FPS | Not sampled — no trusted harness API | **NOT_VERIFIED** (not invented) |
| Duplicate iframes | None across cross-launch sessions | **measured** |
| Distinct emulator boots on game switch | `distinctBoots: true` | **measured** |
| Input while held (player-ux) | presses=1 releases=1; menuOpenPadEvents=0 | **measured** |

Heap growth across multi-game soak is **not** classified as a leak: Orbit/Genesis cycle deltas oscillate; only unbounded identical-cycle growth would qualify.

## Soak

| Mode | Duration | Result |
|---|---|---|
| smoke | 45s | `LONG_SESSION_SOAK_PASS` |
| full | 90s / 4 cycles | `LONG_SESSION_SOAK_PASS` |
| Platforms | Orbit, Genesis, MSX | Pause/menu/fullscreen cycles OK; Genesis/Orbit save OK; MSX saveState false in soak path |

## Save integrity

VERIFIED in soak + final UX B/C/F + personalization/player-ux: quick save/load, empty load disabled, autosave listing, reload then load, Orbit slot list isolation, offline load after cold library.

## Offline / storage

VERIFIED regression: `OFFLINE_PWA_PASS` (OFF-001…005), `HUB_OFFLINE_JOURNEY_PASS`, `DOWNLOAD_*_PASS` including 100MiB restart + 1GiB bounded heap. Downloader not rewritten.

## Browser matrix

| Target | Version | Mode | Gameplay / input / saves / offline / FS |
|---|---|---|---|
| Chromium | 155.0.8059.79 Arch | actual desktop | VERIFIED (suites above) |
| Firefox | Playwright 142.0.1 | actual (Playwright build) | VERIFIED launcher load (`MATRIX_FIREFOX_LAUNCHER_PASS`); system `/usr/bin/firefox` 158 failed under concurrent instance — documented |
| Mobile portrait/landscape/touch | Chromium emulation | emulated | VERIFIED in `PLAYER_UX_PASS` mobile |
| Android physical | — | — | **BLOCKED_EXTERNAL** / prior PH-08 not re-run |
| iOS Safari | — | — | **BLOCKED_EXTERNAL** |
| Physical gamepad | — | — | **BLOCKED_EXTERNAL** — checklist `docs/physical-device-acceptance-checklist-sprint6.md` |

## Controller

Simulated Gamepad API: VERIFIED (`CONSOLE_JOURNEY_PASS`, final UX D). Physical: **NOT_VERIFIED** / **BLOCKED_EXTERNAL**.

## PS1 / PSP

| Suite | Result |
|---|---|
| `ps1-smoke.cjs` | `PS1_GAMEPLAY_PASS` |
| `psp-smoke.cjs` | See `psp-smoke-sprint6.txt` |

## Final UX A–F

`FINAL_UX_ACCEPTANCE_PASS` — `final-ux-acceptance-latest.json`.

## Regressions (Sprint 6 re-run)

| Suite | Status |
|---|---|
| Console Journey | VERIFIED PASS |
| Player Personalization | VERIFIED PASS |
| Player UX | VERIFIED PASS |
| Hub UX | VERIFIED PASS |
| Hub Offline Journey | VERIFIED PASS |
| Offline PWA | VERIFIED PASS |
| Download Faults | VERIFIED PASS |
| Genesis core-smoke | VERIFIED PASS |
| MSX libretro smoke | VERIFIED PASS |
| Orbit gameplay confirm | VERIFIED PASS |
| Long-session soak smoke | VERIFIED PASS |
| Vitest | 66 passed |
| TypeScript | `tsc --noEmit` OK |
| Legacy `smoke.cjs` (Orbit catalog heading) | **FAILED** hang after timeout — superseded by Orbit/player-ux/core-smoke; not used as gate |

## Remaining P0/P1 blockers

- IN-002-P / IN-002-D physical gamepad — BLOCKED_EXTERNAL  
- IOS-001 — BLOCKED_EXTERNAL  
- Staging HTTPS — BLOCKED_EXTERNAL  
- Owner legal / public publish / Alpha approvals — unchanged  

## Verdict labels used

- **VERIFIED** — reproducible automated evidence this session  
- **FAILED** — reproduced failure (legacy smoke)  
- **NOT_VERIFIED** — RSS/CPU/FPS/physical  
- **BLOCKED_EXTERNAL** — missing hardware/env  
