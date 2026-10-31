# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** (product/device/staging gates unchanged).  
**PH-12.1 N64 (2026-10-29):** `mupen64plus_next` **VERIFIED_PLAYABLE** — hold-while-capture smoke `N64_GAMEPLAY_PASS`; save/load; >64 MiB ROM guard. Report `docs/emulator-builds/n64-mupen64plus-next-gameplay.md`.

**PH-12.1 ZX81 (2026-10-29):** `81_eo` **VERIFIED_PLAYABLE** — CRT autostart + CDFLAG/FRAMES; Chromium `ZX81_GAMEPLAY_PASS` (RetroPad Left/Right via `frame.js`→`.ejs_parent` Digit bridge + keyboard 5/8; save 49 KiB); stock `81` untouched. Physical gamepad **NOT_VERIFIED**. CS: `scripts/patches/81_eo/` + locked SHA `2ddbd03b…` — still NOT_CLEARED pending legal review.

**PH-12.2 ColecoVision (2026-10-29):** **BLOCKED_EXTERNAL** — reusable user-BIOS architecture (`user-bios.ts`, Settings importer, `install-private-bios.py`); pinned `gearcoleco` 4.2.3; MIT RetroPIPE fixture. Lawful `colecovision.rom` **not** available in this environment → no interactive gameplay claim. FDS/Sega CD slots reserved (disabled). See `docs/emulator-builds/coleco-gearcoleco-user-bios.md`.

**PH-12.3 Atari ST (2026-10-31 evening):** Hatari **v2.6.1** + EmuTOS; RBGH deferred snapshots; Compose `ATARI_ST_OFFLINE_PWA_PASS` (persistent Chromium profile, SW offline cold-start, `deltaRA=0`, partial-cache repair). **VERIFIED_PLAYABLE** (engineering). OS-level PWA install + physical Android/iOS **NOT_VERIFIED**. Product approval **pending**. Report `docs/emulator-builds/hatari-emutos-atari-st.md`; evidence `.runtime/test-evidence/PH-12/atari-st/`.

**PH-12.2 FDS open BIOS (2026-10-31 evening):** OpenDiskSysROM mount OK. Dreamful A/B/A **rejects** fixture (`inputExceedsIdle=false`). MIT `fds-rbg-move-demo` `FDS_MOVE_DEMO_INTERACTIVE_PASS`. Catalog FDS **disabled**; not VERIFIED_PLAYABLE. `docs/emulator-builds/fds-open-bios-feasibility.md`.

**Player UX (PH-UX):** immersive PlayerShell + Gameplay UX Reliability — verified 2026-10-26.  
**Hub UX (PH-UX-HUB):** Premium Gaming Hub — verified 2026-10-26.  
**Hub UX Acceptance (Sprint 3.1):** offline persistent-profile journey, catalog Back/Forward history, Continue Playing accuracy, stable hub shots — verified 2026-10-26.  
**Sprint 4 Personalization:** per-release prefs, shell display modes, shortcuts, save manager, HUD comfort — verified 2026-10-27.  
**Sprint 4.1 Personalization reliability:** sparse layered prefs + migration, iframe-focus shell-key bridge, real no-remount identity, honest filter copy, save-manager comfort — verified 2026-10-27.  
**Sprint 5 Console Experience:** shortcut safety (F5 reject + modifiers + live allowlist), controller-first launcher nav (simulated), session/audio/fullscreen polish, console journeys — verified 2026-10-27.  
**Sprint 6 Stability:** long-session soak (smoke+full), save integrity, offline/download regressions, final UX A–F, launcher gamepad rAF pause when hidden — verified 2026-10-27. Evidence `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX-STABILITY/`.  
**Open-source SOURCE (2026-10-29):** Root MIT LICENSE enacted; docs cleanup complete; synchronized with `origin/main` at `5d49434` then checklist commits. Rebuild sanitized candidate stamp `20261029-final`. `PUBLIC_SOURCE_READY` technical PASS; publication **STOP** — `docs/open-source/FINAL-PUBLICATION-CHECKLIST.md`.

## Deferred physical / external (do not rediscover)

- IN-002-P / IN-002-D — no gamepad (`docs/physical-device-acceptance.md`)
- IOS-001 — no iOS device (same)
- Staging HTTPS — no authorized staging (`docs/production-staging-verification.md`)

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + NDS + MSX + **N64** + **ZX81** + **Atari ST** |
| EXPERIMENTAL | Jaguar; FDS (move-demo interactive, catalog off) |
| FBNeo | BLOCKED_FIXTURE |
| Atari ST | VERIFIED_PLAYABLE — offline PWA SW journey PASS; OS PWA/physical NOT_VERIFIED |
| FDS | DISABLED catalog; Dreamful rejected; MIT move-demo A/B/A PASS |
| Core lock | **379+ files** (Hatari HTTPS provenance; GameManager FDS mount patch) |

## Player UX pass (2026-10-26)

| Check | Result |
|---|---|
| Acceptance gates (IN/SAV/EMU/CAT/SEC) | `ACCEPTANCE_GATES_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX/acceptance-gates-20261026.txt` |
| Player UX Playwright | `PLAYER_UX_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX/player-ux-20261026.txt` |
| Screenshots | `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX/screenshots/` (desktop shell, game menu, mobile portrait/landscape) |
| Genesis smoke | `GENESIS_GAMEPLAY_PASS` |
| MSX smoke | `MSX_GAMEPLAY_PASS` |
| Vitest / typecheck | 23 passed / `tsc --noEmit` OK |

## Gameplay UX reliability pass (2026-10-26 evening)

| Check | Result |
|---|---|
| Input suspension + change-based dispatch (unit) | 6 InputRouter tests pass |
| Player UX reliability E2E | `PLAYER_UX_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX/player-ux-reliability-20261026.txt` (+ `.json`) |
| Perf evidence | held key presses=1 releases=1; menu-open pad events=0 |
| Genesis quick save/load/reload + pause→reset | PASS in reliability suite |
| Acceptance gates | `ACCEPTANCE_GATES_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX/acceptance-gates-reliability-20261026.txt` |
| Genesis / MSX smokes | `GENESIS_GAMEPLAY_PASS` / `MSX_GAMEPLAY_PASS` |
| Vitest / typecheck | 28 passed / `tsc --noEmit` OK |

## Release-candidate pass (2026-10-26 evening)

| Check | Result |
|---|---|
| Source-offer delivery tests | OK (6) — env URL alone fails; mock ≠ public verified |
| Policy consistency | OK — 3 allowlist copies identical |
| PUBLIC_BROWSER HTTP | genesis/bluemsx 200; blocked/unknown/renamed 404 |
| LOCAL_FULL without flag | FATAL refused |
| LOCAL_FULL restored | MODE=LOCAL_FULL ALLOW=1 files=59 |
| Genesis / MSX | GAMEPLAY_PASS |
| Django / Vitest / typecheck | OK |

## Hub UX pass (2026-10-26 night)

| Check | Result |
|---|---|
| Hub Playwright journeys + responsive | `HUB_UX_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX-HUB/` |
| Player UX reliability (regression) | `PLAYER_UX_PASS` |
| Genesis smoke | `GENESIS_GAMEPLAY_PASS` |
| Vitest / typecheck | 30 passed / `tsc --noEmit` OK |

## Sprint 3.1 Hub UX acceptance (2026-10-26 late)

| Check | Result |
|---|---|
| Hub UX (history Back/Forward, Continue Playing, slow/error catalog, responsive) | `HUB_UX_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX-HUB/hub-ux-sprint31-20261026.txt` |
| Persistent offline journey (Orbit + Genesis) | `HUB_OFFLINE_JOURNEY_PASS` → `hub-offline-journey-20261026.*` |
| Offline PWA (OFF-001…005, PlayerShell Quick save) | `OFFLINE_PWA_PASS` |
| Player UX reliability regression | `PLAYER_UX_PASS` |
| Download faults regression | all `DOWNLOAD_*_PASS` incl. 100MiB restart |
| Vitest / typecheck | 36 passed / `tsc --noEmit` OK |
| Bugs fixed | (1) first filter used `replaceState` so Back failed; (2) Menu visible≠enabled race before `recent:*`; (3) Continue Playing required genuine `recent:*`; (4) mid-load responsive screenshots |

## Sprint 4 personalization (2026-10-27)

| Check | Result |
|---|---|
| Preference unit tests | 50 Vitest passed (prefs/display/shortcuts/slots) |
| Player personalization E2E | `PLAYER_PERSONALIZATION_PASS` → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX-PERSONALIZE/` |
| Player UX reliability regression | `PLAYER_UX_PASS` (Orbit/Genesis/MSX/mobile) |
| Typecheck | `tsc --noEmit` OK |
| Architecture | Prefs keyed by release id; Fit/Original shell CSS; integer scaling disabled honestly; no emulator remount on display change |
| Limitations | No native framebuffer → no integer scaling; gamepad menu nav is simulated Start/Select only; physical gamepad NOT_VERIFIED |

## Sprint 4.1 personalization reliability (2026-10-27)

| Check | Result |
|---|---|
| Bugs reproduced | Release prefs saved as full default-normalized snapshots (froze unrelated globals); parent `keydown` missed iframe-focused shortcuts; `data-iframe-epoch` alone was weak remount evidence; sharp/smooth copy over-promised framebuffer filtering |
| Layered prefs | Sparse `kind:overlay` patches; legacy full snapshots preserved as overrides; reset clears release overlay → global inheritance |
| Pref / display unit tests | 58 Vitest passed; `tsc --noEmit` OK |
| Iframe-focus shortcuts | Session-scoped `shell-key` from `frame.js` / dos / j2me / native inject; Escape/Pause/F8 quick-save verified with real iframe focus; default quick-save **F8** (F5 reload risk) |
| No-remount evidence | Same `data-runtime-session` + same iframe DOM `nodeMark` across Fit→Original, filter, HUD, volume/filter, fullscreen |
| Save Manager | Timestamps refresh after save; empty Load disabled; load requires confirm; failed load cannot toast success |
| Player personalization E2E | `PLAYER_PERSONALIZATION_PASS` → `player-personalization-sprint41.txt` / `player-personalization-latest.json` |
| Player UX / Hub / Offline | `PLAYER_UX_PASS`, `HUB_UX_PASS`, `HUB_OFFLINE_JOURNEY_PASS`, `OFFLINE_PWA_PASS` |
| Download faults | All `DOWNLOAD_*_PASS` incl. 100MiB restart + 1GiB bounded memory |
| Limitations unchanged | Integer scaling unavailable; physical gamepad / iOS Safari / staging HTTPS remain **NOT_VERIFIED** |

### Sprint 4.1 next concrete task

1. ~~Optional: live shell-key allow-list~~ — done in Sprint 5
2. Owner gates: copyright / public push / legal review / source-offer HTTPS (unchanged)
3. QA: physical gamepad + iOS; Ops: staging HTTPS

## Sprint 5 console experience (2026-10-27)

| Check | Result |
|---|---|
| Shortcut safety | F5 rejected + migrated to F8; Ctrl/Alt/Meta blocked; repeat/composing ignored; editable targets skipped; shell-key forwards real modifiers |
| Live allowlist sync | `setShellShortcutCodes` on prefs change without remount |
| Controller-first launcher | `LauncherGamepadNav` D-pad/stick + Start/A confirm + Select/B back; neutral gate; GameMenu keeps Start/Select; status chip |
| Console journeys | `CONSOLE_JOURNEY_PASS` A–F → `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX-CONSOLE/` (**simulated** pad) |
| Player personalization / UX / Hub / Offline / Downloads | All PASS (Sprint 5 regression) |
| Vitest / typecheck | 65 passed / `tsc --noEmit` OK |
| Perf (player-ux) | heldKey presses=1 releases=1; menuOpenPadEvents=0 |
| Limitations | Physical gamepad / iOS Safari / staging HTTPS **NOT_VERIFIED**; integer scaling unsupported |

### Sprint 5 next concrete task

1. Physical gamepad acceptance when hardware available
2. Owner gates: copyright / public push / legal review / source-offer HTTPS
3. Optional: richer catalog spatial (2D) focus grid for large libraries

## Sprint 6 stability (2026-10-27)

| Check | Result |
|---|---|
| Long-session soak smoke/full | `LONG_SESSION_SOAK_PASS` — Orbit/Genesis/MSX; distinct boots; no duplicate iframes |
| Heap (CDP) | Measured page JS heap; Genesis trend OK; RSS unavailable; no leak claim |
| Performance fix | Launcher gamepad cancels rAF while `document.hidden` (+ Vitest) |
| Final UX A–F | `FINAL_UX_ACCEPTANCE_PASS` |
| PS1 / PSP smokes | `PS1_GAMEPLAY_PASS` / see PSP evidence |
| Firefox launcher | Playwright Firefox 142.0.1 PASS (system Firefox 158 blocked by concurrent instance) |
| Regressions | Console / Personalization / Player UX / Hub / Offline PWA / Downloads / Genesis / MSX / Orbit PASS; Vitest 66; tsc OK |
| Physical gamepad / iOS / Android re-cert | **BLOCKED_EXTERNAL** — checklist `docs/physical-device-acceptance-checklist-sprint6.md` |
| Report | `.runtime/test-evidence/ or private archive; see docs/qa-summary.md — PH-UX-STABILITY/sprint6-final-report.md` |

### Sprint 6 next concrete task

1. Physical gamepad + iOS when hardware available (do not mark passed without devices)
2. Owner gates unchanged (copyright / public push / legal / source-offer HTTPS)
3. Stop — do not start an unrelated feature sprint from this milestone

## Hub-offline release gate (2026-10-29)

| Check | Result |
|---|---|
| Root cause | Compose/`seed_demo --safe-assets-only` omitted `--with-console-fixtures` → Genesis absent on clean stacks |
| Fix | Seed console fixtures in compose + local seed scripts; clearer hub-offline catalog-miss error |
| `hub-offline-journey.cjs` | `HUB_OFFLINE_JOURNEY_PASS` (Orbit + Genesis offline install/play/save-load) |
| Genesis `core-smoke` | `GENESIS_GAMEPLAY_PASS` |
| Publication | **STOP** |

## Public docs cleanup (2026-10-28)

| Check | Result |
|---|---|
| Tip `docs/` | ~94 tracked files / ~0.58 MiB (was ~966 / ~25.8 MiB) |
| Generated evidence | Untracked; archive under private runtime + offline SSD copy (no Chromium profiles) |
| Emulator build provenance | `docs/emulator-builds/` (PH-05 notes migrated) |
| Test evidence path | `.runtime/test-evidence/` (`RBG_TEST_EVIDENCE_DIR`) |
| Hygiene CI | `scripts/check-docs-hygiene.py` |
| Genesis smoke post-cleanup | `GENESIS_GAMEPLAY_PASS` |
| Sanitized candidate | Rebuild after tip; see `docs/open-source/docs-cleanup-summary.md` |
| Publication | **STOP** |

## Open-source SOURCE prep (2026-10-28)

| Check | Result |
|---|---|
| Private HEAD at audit | `1f4ddbe` (synced with origin); milestone commits land after |
| Git bundle backup + restore | PASS → `retro-browser-gaming-os-backup-20261028/` |
| Second independent backups | PASS on `/mnt/SSD2/` (assets + bundle); 20261026 backups retained |
| `scripts/setup.sh` | source-only / local-full / check / dry-run / no-start |
| `install-private-bios.py` | Manual authorized firmware only |
| `check-public-source-safety.py` | Tip gates + CI `--quick` |
| Sanitized candidate (B1) | Isolated filter-repo; see candidate `CANDIDATE_HEAD.txt` |
| Root LICENSE | **BLOCKED_HUMAN** |
| Publication | **STOP** — no public push |

### Next concrete task (owner)

1. Confirm copyright holder; enact root LICENSE on private `main`
2. Approve Option B1 push of **20261028** candidate to a **new** public repo
3. Do not force-push or open the existing private GitHub repo

## PH-12.1 N64 pass (2026-10-29)

| Check | Result |
|---|---|
| Root cause | USB64 fixture is live-input-only; prior smoke released before capture |
| Smoke | `N64_GAMEPLAY_PASS` (stick `x:80` + A while held; `stateBytes=16793440`) |
| Offline after boot | PASS |
| ROM size guard | `frame.js` → `N64_ROM_TOO_LARGE` above 64 MiB |
| Catalog seed | `n64` console + `mit-n64-controller-test` fixture |
| Vitest / typecheck | 68 passed / `tsc --noEmit` OK |
| Evidence | `.runtime/test-evidence/PH-12/n64/` + `docs/emulator-builds/n64-mupen64plus-next-gameplay.md` |

### Jaguar re-check (same day)

Reproduced black FB / `Size is zero` on `virtualjaguar` + `virtualjaguar_js` with MIT jag2048; raw `.bin` still ~6824 lit without proven input delta. Remains **EXPERIMENTAL** — `docs/emulator-builds/jaguar-ph12-recheck-20261029.md`.

## PH-12.1 ZX81 pass (2026-10-29)

| Check | Result |
|---|---|
| Root cause | Fixture CDFLAG/`altint_on` FRAMES wait blocked CRT→main; EJS RetroPad `simulateInput` does not feed keybovl |
| Fix | `81_eo` `eo_loadp` CRT `$4092` + CDFLAG/FRAMES patch; smoke uses keyboard 5/8 |
| Smoke | `ZX81_GAMEPLAY_PASS` (`stateBytes=49216`, input/menu frame deltas) |
| Native | Dot `_x` 15→31→0 with lit FB (`native-dotmove.txt`) |
| Stock `81` | Unchanged |
| Vitest / typecheck | runtime-errors OK / `tsc --noEmit` OK |
| Evidence | `.runtime/test-evidence/PH-12/zx81/` + `docs/emulator-builds/zx81-eo-loadp-build.md` |

### Next concrete task

1. FDS: Compose offline cold-start for MIT move-demo + NES/FCEUmm regression; then reconsider catalog
2. PH-12.1: Jaguar — only with a rights-clear Alpine/`.j64` path or honest EXPERIMENTAL closeout
3. Atari ST: optional OS-level PWA install + physical-device gates (explicitly NOT_VERIFIED)
4. Owner gates unchanged (publication STOP)

## Remaining blockers / next

1. Owner: authorize Option B public repo push of sanitized candidate (LICENSE enacted)
2. Counsel: legal-review package; `NEEDS_LEGAL_REVIEW` ≠ approval
3. Owner: publish corresponding-source offer on HTTPS; gate must fetch PASS before `OFFER_DELIVERY_VERIFIED`
4. Product: Alpha game set approvals (incl. Atari ST / N64/ZX81 fixtures if desired)
5. Resolve CS for `virtualjaguar_js` (`81_eo` patch + rebuild notes now packaged); Hatari/EmuTOS CS pins recorded
6. QA: physical gamepad + iOS; Ops: staging HTTPS
7. Playwright offline ≠ physical-device offline certification (document only)
8. Continue PH-12.1 Jaguar (only remaining 12.1 EXPERIMENTAL)
9. FDS catalog still disabled pending offline cold-start + NES regression after move-demo A/B/A
