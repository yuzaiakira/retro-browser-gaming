# Execution state

## Verdict

**PH-20 human approval workflow / PUBLIC_RELEASE_GO = STOP** (2026-11-05). Tip `b7a8587` lineage+. Owner attestation manifests **18** groups / **146** files; counsel decision manifests **52** groups / **65** questions; unresolved legal flags **3**; human approvals received **0**. Validator + mirror `HUMAN_APPROVALS` fail-closed. Tests: `scripts/test_human_approvals.py` **15 passed**. **PUBLIC_SOURCE_MIRROR_READY=NOT_CLEARED**; **GITHUB_SOURCE_PUSH_READY=NOT_CLEARED**; **PUBLIC_RELEASE_GO=STOP**. Report: `docs/release/legal-review/approval-validation-report.md`.

**PH-19 provenance remediation / PUBLIC_RELEASE_GO = STOP** (2026-11-05). Tip `0e920f2` lineage+. Technical provenance gaps **200→0** via `fixture-provenance-index.json` (201 linkages); **3** residual legal-uncertainty flags; NLR still **562**; groups **52**; questions **65**; auto-approvals **0**. **PUBLIC_SOURCE_MIRROR_READY=NOT_CLEARED**; **GITHUB_SOURCE_PUSH_READY=NOT_CLEARED**; **PUBLIC_RELEASE_GO=STOP**. Report: `docs/release/legal-review/provenance-remediation-report.md`.

**PH-18 legal review queues / PUBLIC_RELEASE_GO = STOP** (2026-11-05). 562 NLR → 30 groups / 43 questions baseline. Packs under `docs/release/legal-review/`.

**PH-17 Option B public-source mirror / PUBLIC_RELEASE_GO = STOP** (2026-11-05). Candidate `c8c6fba` from pin `c2cff75`. **PUBLIC_SOURCE_MIRROR_READY=NOT_CLEARED** (legal). Pipeline: `scripts/build-public-source-mirror.sh`. No remote created/pushed.

**PH-16 history remediation / PUBLIC_RELEASE_GO = STOP** (2026-11-05). Private tip `24b8c55` lineage. Isolated sanitized candidate `e881502…` **PASS**. **TIP_HYGIENE=PASS**; **HISTORY_SANITIZATION_CANDIDATE=PASS**; **HISTORY_SANITIZED_TESTS=PASS**; **GITHUB_SOURCE_PUSH_READY=NOT_CLEARED**; **PUBLIC_RELEASE_GO=STOP**. Docs: `docs/release/git-history-remediation-plan.md`.

**Development on `main` / PUBLIC_RELEASE_GO = STOP** (2026-11-05). Tip `12a614b` lineage. **GITHUB_SOURCE_PUSH_READY = NOT_CLEARED** — tip tree clean of private `.wasm`/`.data`, but reachable history still contains emulator binaries + `docs/test-evidence/` profiles (`main-push-safety-audit.md`). Integrated feat via `d650bf4`. Do not push public source or deploy.

**Development on `main` / PUBLIC_RELEASE_GO = STOP** (2026-11-04). Integrated `feat/platform-expansion-phase-1` via merge `d650bf4` (includes `b53e66d` handoff). Future engineering continues on `main`. External blockers unchanged. Report: `docs/release/main-integration-report.md`.

**External acceptance handoff / PUBLIC_RELEASE_GO = STOP** (2026-11-04). Unified checklist `docs/release/external-acceptance-checklist.json` + `external-acceptance-handoff.md`; fail-closed `scripts/check-public-release-go.py`. Source package ready; recipient HTTPS / counsel / product / physical still open. Tip lineage `ad562fd`+. Engineering baseline `318832d` preserved.

**PH-14 / PUBLIC_RELEASE_GO = STOP** (2026-11-04). Actionable blocker pack prepared on `8a70f45` lineage: source **package built** + mock integrity OK, recipient HTTPS **NOT_VERIFIED**; legal pack **0 counsel approvals**; product queue **0/53**; staging/Android/iOS **BLOCKED_EXTERNAL**. Engineering baseline `318832d` preserved. See `docs/release/go-no-go.md`, `blocker-registry.md`.

**PH-13 PRIVATE RC / PUBLIC_RELEASE_GO = STOP** (2026-11-03). Engineering gates PASS on tip `318832d` lineage; source delivery **NOT_VERIFIED**; catalog product approval **0/53**; Android/iOS physical **BLOCKED_EXTERNAL**. Pack: `docs/release/` (`go-no-go.md`).

**RELEASE CANDIDATE / NOT COMPLETE** (product/device/staging gates unchanged).  
**PH-12.1 N64 (2026-10-29):** `mupen64plus_next` **VERIFIED_PLAYABLE** — hold-while-capture smoke `N64_GAMEPLAY_PASS`; save/load; >64 MiB ROM guard. Report `docs/emulator-builds/n64-mupen64plus-next-gameplay.md`.

**PH-12.1 ZX81 (2026-10-29; soak integrity refresh 2026-11-02):** `81_eo` **VERIFIED_PLAYABLE** — CRT autostart + CDFLAG/FRAMES; Chromium `ZX81_GAMEPLAY_PASS` (RetroPad Left/Right via `frame.js`→`.ejs_parent` Digit bridge + keyboard 5/8; save 49 KiB); stock `81` untouched. Physical gamepad **NOT_VERIFIED**. CS: `scripts/patches/81_eo/` + locked wasm SHA `09c7afa9…` / report `04c8b1f9…` (rebuild after private-store loss; EJS `minimumEJSVersion` 4.2.2) — still NOT_CLEARED pending legal review.

**PH-12.2 ColecoVision (2026-10-29):** **BLOCKED_EXTERNAL** — reusable user-BIOS architecture (`user-bios.ts`, Settings importer, `install-private-bios.py`); pinned `gearcoleco` 4.2.3; MIT RetroPIPE fixture. Lawful `colecovision.rom` **not** available in this environment → no interactive gameplay claim. Sega CD slot remains reserved (disabled). See `docs/emulator-builds/coleco-gearcoleco-user-bios.md`.

**PH-12.3 Atari ST (2026-10-31 evening):** Hatari **v2.6.1** + EmuTOS; RBGH deferred snapshots; Compose `ATARI_ST_OFFLINE_PWA_PASS` (persistent Chromium profile, SW offline cold-start, `deltaRA=0`, partial-cache repair). **VERIFIED_PLAYABLE** (engineering). OS-level PWA install + physical Android/iOS **NOT_VERIFIED**. Product approval **pending**. Report `docs/emulator-builds/hatari-emutos-atari-st.md`; evidence `.runtime/test-evidence/PH-12/atari-st/`.

**PH-12.2 FDS (2026-10-31 night):** OpenDiskSysROM LGPL mount + fail-closed BIOS gating (`entryExtensions: ["fds"]` so NES never requires disksys). MIT move-demo A/B/A `FDS_MOVE_DEMO_INTERACTIVE_PASS`; Compose `FDS_OFFLINE_PWA_PASS`; `NES_FCEUMM_REGRESSION_PASS`. Engineering catalog `mit-fds-move-demo` (product approval **pending**). **VERIFIED_PLAYABLE** (engineering). OS PWA/physical **NOT_VERIFIED**. `docs/emulator-builds/fds-open-bios-feasibility.md`; evidence `.runtime/test-evidence/PH-12/fds/`.

**PH-12.3 Vectrex (2026-10-31 night):** Firmware audit **NO-GO** for embedding GCE/MB `system.img` (`320ccdcc…`, contains Mine Storm). Patched `libretro-vecx` `dccff540…` loads user BIOS only; MIT Dot fixture; registry + user-BIOS slot. **BLOCKED_EXTERNAL** — no authorized BIOS in environment → no `VECTREX_GAMEPLAY_PASS` / offline PWA. Docs: `vecx-firmware-audit.md`, `vecx-vectrex-build.md`; evidence `.runtime/test-evidence/PH-12/vectrex/`.

**PH-12.3 Atari 8-bit (2026-11-01):** `atari800` (libretro-atari800 `4e7fbc73…` + memstream ABI patch; emsdk 3.1.74; EJS/build `677b1334…`) with **AltirraOS + Altirra BASIC only** (no proprietary Atari OS). Distinct from `a5200`. MIT Dot `.xex` (`bd52416d…`). Chromium A/B/A `ATARI8_GAMEPLAY_PASS`; save ~188768 B `ATARI8_SAVE_RESTORE_PASS`; Compose `ATARI8_OFFLINE_PWA_PASS`. **VERIFIED_PLAYABLE** (engineering). Product approval **pending**. OS PWA/physical **NOT_VERIFIED**. Docs: `atari8-libretro-build.md`, `atari8-firmware-audit.md`; evidence `.runtime/test-evidence/PH-12/atari8/`.

**Orbit catalog smoke triage (2026-11-01):** Prior `tests/smoke.cjs` timeout was **test staleness** (paginated Discover no longer shows Orbit on page 1; PlayerShell uses Quick save/load). Not a catalog API defect. Fixed smoke: `RESPONSIVE_KEYBOARD_PASS` … `OFFLINE_LOAD_PASS`. Evidence `.runtime/test-evidence/PH-12/orbit-smoke-triage/`.

**PH-12.5 Dreamcast / Flycast WASM (2026-11-01):** Pin **v1.0** `16e9c7b4…` / Flycast `2c48c01`; GPLv2; packaged `flycast-wasm.data` `5ef913f5…` (wasm `db2b87d8…` + libelf JS polyfill / zip soft-stubs; allowlist **`LOCAL_ONLY`**). MIT Dot ELF `ffafb5d5…`. Chromium **`DREAMCAST_HLE_BOOT_VISIBLE`** + **`DREAMCAST_GAMEPLAY_PASS`** + **`DREAMCAST_SAVE_RESTORE_PASS`** + Compose **`DREAMCAST_OFFLINE_PWA_PASS`** (HLE + `reicast_emulate_framebuffer`; no SEGA BIOS). **VERIFIED_PLAYABLE** (engineering). Product approval **pending**. OS PWA/physical **NOT_VERIFIED**. Docs: `flycast-wasm-dreamcast.md`, `dreamcast-firmware-audit.md`; evidence `.runtime/test-evidence/PH-12/dreamcast/`.

**PH-12.5 Dreamcast large-media (2026-11-02):** Flycast forced onto BlobFS on-demand; 64-bit-safe SAB reader + diagnostics; GDI/M3U parsers. Truncated mkdcdisc GDI: **`DREAMCAST_GDI_GAMEPLAY_PASS`** + **`DREAMCAST_GDI_SAVE_RESTORE_PASS`** + Compose **`DREAMCAST_GDI_OFFLINE_PWA_PASS`** (catalog `mit-dreamcast-dot-gdi`). mkdcdisc CDI (~706 MiB): **`DREAMCAST_CDI_GAMEPLAY_PASS`** (wasm heap 256 MiB; MEMFS `bytesWritten=0`; peak staging ~2 KiB). Download faults re-PASS incl. 100 MiB restart + 1 GiB bounded heap. Docs: `flycast-media-formats.md`, `docs/reports/dreamcast-large-media-hardening.md`; evidence `.runtime/test-evidence/PH-12/dreamcast-large-media/`.

**PH-12.5 Dreamcast CHD + disc-swap (Compose closeout 2026-11-03):** Prior “CHD blocked by `chdstream_*` stubs” was **incorrect** — Flycast uses **CHDDisc → libchdr**. Pack `c5f0c6ca…` / `1.0.3-rbg-libelf-js-m3u`. Chromium CHD gameplay/memory/save + interactive disc-swap PASS. Docker “missing socket” was **agent sandbox isolation** (host `docker.service` was already active). Clean Compose rebuild **`COMPOSE_CHD_CLEAN_BUILD_PASS`**; Compose **`DREAMCAST_CHD_OFFLINE_PWA_PASS`** + **`DREAMCAST_CHD_CLEAN_BUILD_PASS`**; clean-build soak **`CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS`** (10/10, `SOAK_CYCLES=2`). Allowlist/lock synced for Flycast pack + `emulator.js`; seed Flycast extensions include `m3u`. Report `docs/reports/dreamcast-chd-disc-swap.md`; evidence `.runtime/test-evidence/PH-12/dreamcast-chd|soak/`.

**PH-12.6 Flash / Ruffle (2026-11-01):** Official selfhosted **0.7.1** (`v0.7.1` / `89a70499…`; zip `ef12edbe…`; MIT OR Apache-2.0). Dedicated `ruffle-frame` + CSP; `polyfills:false`; EI off; MIT Dot SWF `3f5c78f2…` (Haxe 4.3). **`FLASH_RUFFLE_GAMEPLAY_PASS`** + SharedObject **`FLASH_RUFFLE_PROGRESS_PERSISTENCE_PASS`** + Compose **`FLASH_RUFFLE_OFFLINE_PWA_PASS`**. **`saveState=false`** (no Quick Save). **VERIFIED_PLAYABLE** (engineering) under documented save semantics. Product approval **pending**. Docs: `ruffle-web-integration.md`, `flash-save-capabilities.md`, `flash-security-audit.md`; evidence `.runtime/test-evidence/PH-12/flash/`.

**PH-12.4 Arcade / MAME WASM (2026-11-01 evening):** License **GO** for **`rbgdot`** only; FBNeo/MAMEDev free ROMs **NO-GO**. Root cause: `drawogl.cpp` → `glShadeModel` under WebGL. Fix: `NO_OPENGL=1` + `-video soft` (stale `drawogl.o` must be rebuilt). wasm `1d211f74…` / js `a3325ef7…` (`LOCAL_ONLY`). Chromium **`ARCADE_RBGDOT_GAMEPLAY_PASS`** + **`ARCADE_RBGDOT_SAVE_RESTORE_PASS`** + Compose **`ARCADE_RBGDOT_OFFLINE_PWA_PASS`** (SW offline; post-repair offline re-boot soft). Frame RPC uses `reply` protocol. **VERIFIED_PLAYABLE** (engineering). Product approval **pending**. OS PWA/physical **NOT_VERIFIED**. Other MAME drivers unverified. Docs: `mame-wasm-arcade.md`; evidence `.runtime/test-evidence/PH-12/arcade/`.

**Cross-console soak (2026-11-02):** **`CROSS_CONSOLE_SOAK_FULL_PASS`** and **`CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS`** (10/10, `SOAK_CYCLES=2`) on freshly built Compose images. ZX81: lock/provision + report allowlist (`09c7afa9…`). FDS: harness OpenDiskSysROM IDB seed. BuildKit: `/dev/null` secret placeholder replaced with empty regular file → **`COMPOSE_CLEAN_REBUILD_PASS`**. CSP: path-scoped middleware policy; runtime **no** `unsafe-inline`; shell `wasm-unsafe-eval` for hash-wasm, **no** `unsafe-eval` → **`RUNTIME_CSP_SECURITY_PASS`**. Arcade rbgdot gameplay/save/offline PASS on clean image. Reports: `docs/reports/cross-console-soak.md`, `compose-rebuild-verification.md`, `runtime-csp-audit.md`. Product approval **PENDING**; OS PWA/physical **NOT_VERIFIED**; other MAME drivers **NOT_VERIFIED**; FBNeo **NO-GO**.

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
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + NDS + MSX + **N64** + **ZX81** + **Atari ST** + **FDS** + **Atari 8-bit** + **Dreamcast** + **Flash/Ruffle** |
| EXPERIMENTAL | Jaguar |
| Arcade `rbgdot` | **VERIFIED_PLAYABLE** (engineering) — `ARCADE_RBGDOT_*` gameplay/save/offline; product pending |
| BLOCKED_EXTERNAL | ColecoVision; **Vectrex** (awaiting authorized `system.img`) |
| FBNeo | BLOCKED_FIXTURE (do not ship in unrestricted public app) |
| Arcade | VERIFIED_PLAYABLE (engineering) — `rbgdot` only; `ARCADE_RBGDOT_GAMEPLAY_PASS` + save + offline PWA; product pending; other drivers unverified |
| Atari ST | VERIFIED_PLAYABLE — offline PWA SW journey PASS; OS PWA/physical NOT_VERIFIED |
| Atari 8-bit | VERIFIED_PLAYABLE (engineering) — `ATARI8_GAMEPLAY_PASS` + `ATARI8_SAVE_RESTORE_PASS` + `ATARI8_OFFLINE_PWA_PASS`; product approval pending; distinct from 5200 |
| Dreamcast | VERIFIED_PLAYABLE (engineering) — ELF + GDI + CDI + CHD gameplay/save/offline + interactive disc-swap; Compose `DREAMCAST_CHD_OFFLINE_PWA_PASS` + clean soak PASS; reios HLE; no SEGA BIOS; product approval pending; OS PWA/physical NOT_VERIFIED |
| Flash / Ruffle | VERIFIED_PLAYABLE (engineering) — `FLASH_RUFFLE_GAMEPLAY_PASS` + SharedObject progress + `FLASH_RUFFLE_OFFLINE_PWA_PASS`; Quick Save not claimed; product approval pending |
| FDS | VERIFIED_PLAYABLE (engineering) — `FDS_OFFLINE_PWA_PASS` + `NES_FCEUMM_REGRESSION_PASS`; product approval pending |
| Vectrex | BLOCKED_EXTERNAL — external-BIOS vecx path + MIT Dot; no lawful BIOS → no gameplay claim |
| Core lock | **397 files** LOCAL_FULL (includes `ruffle-0.7.1/*` + `81_eo` report) |
| Cross-console soak | **`CROSS_CONSOLE_SOAK_FULL_PASS`** + **`CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS`** (10/10, 2026-11-03 CHD clean images) |

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

1. Vectrex: operator imports authorized `system.img` → gameplay A/B/A + Compose offline → reconsider VERIFIED_PLAYABLE
2. PH-12.1: Jaguar — only with a rights-clear Alpine/`.j64` path or honest EXPERIMENTAL closeout
3. Flash / Dreamcast / Atari ST / FDS / Atari 8-bit: optional OS-level PWA install + physical-device gates (explicitly NOT_VERIFIED); optional Flash dedicated-origin hardening
4. Product: human product-approval for engineering fixtures — never auto-approve
5. Owner gates unchanged (publication STOP)

## PH-12.2 FDS pass (2026-10-31 night)

| Check | Result |
|---|---|
| BIOS | OpenDiskSysROM LGPL-3.0 `6ce74ea4…` @ `/disksys.rom` + system path; fail-closed missing/invalid |
| NES isolation | `entryExtensions: ["fds"]` — NES never requires disksys; `NES_FCEUMM_REGRESSION_PASS` |
| Interactive A/B/A | `FDS_MOVE_DEMO_INTERACTIVE_PASS` (leftVsIdle/rightVsLeft ≈312) |
| Compose offline | `FDS_OFFLINE_PWA_PASS` (SW offline; OS PWA/physical NOT_VERIFIED) |
| Partial-cache repair | PASS; BIOS IDB survived |
| Engineering catalog | `mit-fds-move-demo` seeded; `product_approval_status=pending` |
| Quality gates | Vitest 75; tsc OK; Django 43; Atari offline PASS; N64/ZX81/NES smokes PASS; core-lock LOCAL_FULL+SOURCE_ONLY; PUBLIC_SOURCE_SAFETY_PASS |
| Evidence | `.runtime/test-evidence/PH-12/fds/` |

## PH-12.3 Atari 8-bit pass (2026-11-01)

| Check | Result |
|---|---|
| Firmware | AltirraOS + Altirra BASIC (FSF all-permissive) — GO; no proprietary Atari OS bundled |
| WASM | `atari800` pin `4e7fbc73…`; hashes `6d19d006…` / `b7b6664b…`; memstream ABI patch |
| Interactive A/B/A | `ATARI8_GAMEPLAY_PASS` (left/right/fire vs idle; seekable VFS) |
| Save/restore | `ATARI8_SAVE_RESTORE_PASS` (~188768 B; restore deltaVsA=0; post-restore interaction) |
| Compose offline | `ATARI8_OFFLINE_PWA_PASS` (library cold-start, SW offline, partial-cache repair) |
| Engineering catalog | `mit-atari8-dot` / console `atari-8bit`; `product_approval_status=pending` |
| Isolation | Does **not** inherit Atari 5200 (`a5200`) evidence |
| Evidence | `.runtime/test-evidence/PH-12/atari8/` |
| Regressions | Atari ST / FDS / NES / Genesis core / a5200 / N64 / ZX81 GAMEPLAY_PASS; Vitest 76; tsc OK; Django 43; core-lock 382 LOCAL_FULL; PUBLIC_SOURCE_SAFETY_PASS; SOURCE_OFFER_GATE_OK |

## PH-12.6 Flash / Ruffle pass (2026-11-01)

| Check | Result |
|---|---|
| Runtime | Ruffle 0.7.1 selfhosted; commit `89a70499…`; zip `ef12edbe…`; MIT OR Apache-2.0 |
| Isolation | Dedicated frame; `polyfills:false`; EI off; CSP `connect-src 'self'`; SWF bytes only |
| Fixture | MIT Dot SWF `3f5c78f2…` (Haxe 4.3.7) |
| Interactive | `FLASH_RUFFLE_GAMEPLAY_PASS` |
| Progress | SharedObject `FLASH_RUFFLE_PROGRESS_PERSISTENCE_PASS` — **not** Quick Save |
| Compose offline | `FLASH_RUFFLE_OFFLINE_PWA_PASS` |
| Baseline | Genesis `GENESIS_GAMEPLAY_PASS`; Orbit `OFFLINE_LOAD_PASS`; historical EXIT=137 preserved under `.runtime/test-evidence/PH-12/flash/baseline-genesis-exit137.json` |
| Regressions | Genesis/Orbit/Atari8/Atari ST/FDS/NES/N64/ZX81/Dreamcast PASS; Vitest 76; tsc OK; Django 43; core-lock 395; PUBLIC_SOURCE_SAFETY_PASS; SOURCE_OFFER_GATE_OK |
| Evidence | `.runtime/test-evidence/PH-12/flash/` |

## PH-12.5 Dreamcast pass (2026-11-01)

| Check | Result |
|---|---|
| BIOS/HLE | reios HLE **GO** on this WASM pack (no `dc_boot.bin` / `dc_flash.bin`); SEGA BIOS never bundled |
| Core | Flycast WASM v1.0 `16e9c7b4…` / Flycast `2c48c01`; pack `5ef913f5…` (3430469 B); wasm `db2b87d8…` |
| Fixture | MIT Dot ELF `ffafb5d5…` (KallistiOS) |
| Interactive | `DREAMCAST_GAMEPLAY_PASS` (Left/Right/A; `emulate_framebuffer`) |
| Save/restore | `DREAMCAST_SAVE_RESTORE_PASS` (~28 MiB) |
| Compose offline | `DREAMCAST_OFFLINE_PWA_PASS` (SW cold-start; library; restore+save; no server deps) |
| Engineering catalog | `mit-dreamcast-dot`; `product_approval_status=pending` |
| Allowlist | `LOCAL_ONLY` (sync fields fixed so Compose LOCAL_FULL starts) |
| Evidence | `.runtime/test-evidence/PH-12/dreamcast/` |
| Regressions | Genesis / Atari8 / Atari ST / FDS / NES / N64 / ZX81 GAMEPLAY_PASS; Vitest 76; tsc OK; Django 43; core-lock 385 LOCAL_FULL; PUBLIC_SOURCE_SAFETY_PASS; SOURCE_OFFER_GATE_OK |

## PH-12.5 Dreamcast large-media pass (2026-11-02)

| Check | Result |
|---|---|
| BlobFS | flycast in `ON_DEMAND_CORES`; 64-bit offsets; diagnostics (reads/seeks/latency/outstanding) |
| GDI gameplay/save | `DREAMCAST_GDI_GAMEPLAY_PASS` + `DREAMCAST_GDI_SAVE_RESTORE_PASS` (~36 MiB) |
| GDI offline | Compose `DREAMCAST_GDI_OFFLINE_PWA_PASS` (`mit-dreamcast-dot-gdi`) |
| CDI gameplay | `DREAMCAST_CDI_GAMEPLAY_PASS` (740076137 B; heapBoundOk; peakStaging 2335) |
| CHD | **BLOCKED** in this pass — superseded evening of 2026-11-02 (see CHD + disc-swap section) |
| Downloads | All `DOWNLOAD_*_PASS` incl. 100 MiB restart + 1 GiB bounded memory |
| ELF baseline | `DREAMCAST_GAMEPLAY_PASS` + `DREAMCAST_OFFLINE_PWA_PASS` re-PASS |
| Regressions | Vitest 85; tsc OK; Django 43; Genesis/NES/Atari8/Atari ST/FDS/Flash/Arcade/PSP/PS1/SNES PASS; arcade first attempt flaky page-close then retry PASS |
| Evidence | `.runtime/test-evidence/PH-12/dreamcast-large-media/` |
| Commits (unpushed) | `e294044` … `e7d1c3f` on `feat/platform-expansion-phase-1` — no Cursor co-author trailers |
| Full 10-platform soak | Not re-run this pass; representative Genesis/NES/Atari8/Atari ST/FDS/Flash/Arcade/PSP/PS1/SNES + Dreamcast ELF/GDI/CDI PASS |

## PH-12.5 Dreamcast CHD Compose closeout (2026-11-03)

| Check | Result |
|---|---|
| Docker root cause | Agent sandbox hid `/var/run/docker.sock`; host Docker was already running (`docker.service` active) |
| Clean Compose rebuild | `COMPOSE_CHD_CLEAN_BUILD_PASS` — `./scripts/compose.sh build api web`; Flycast `c5f0c6ca…`; core-lock 397; proxy_ca regular-file preserved |
| Catalog unblock | Flycast seed extensions + `m3u`; allowlist/lock for pack + `emulator.js` `27e949d3…` |
| CHD Compose offline | `DREAMCAST_CHD_OFFLINE_PWA_PASS` + `DREAMCAST_CHD_CLEAN_BUILD_PASS` (SW offline; partial-cache repair; integrity reject; no server deps) |
| Clean-build soak | `CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS` / `CROSS_CONSOLE_SOAK_FULL_PASS` (10/10, `SOAK_CYCLES=2`) |
| Regressions | Dreamcast ELF/GDI/CDI/CHD/disc-swap; Arcade; Genesis; NES; FDS; ZX81; Atari8; Atari ST; N64; PSP; Flash; Orbit; Vitest 85; tsc; Django 43; core-lock; PUBLIC_SOURCE_SAFETY; SOURCE_OFFER_GATE_OK |
| Evidence | `.runtime/test-evidence/PH-12/dreamcast-chd/`, `PH-12/soak/` |
| Report | `docs/reports/dreamcast-chd-disc-swap.md` |

### Next concrete task

1. Optional: native Flycast `.m3u` content-path boot (adapter workaround only today)
2. Owner gates unchanged (publication STOP); product approval for Dreamcast fixtures
3. OS PWA / physical device gates remain **NOT_VERIFIED**
4. Vectrex / ColecoVision remain **BLOCKED_EXTERNAL** until lawful BIOS

## PH-13 private release readiness (2026-11-03)

| Check | Result |
|---|---|
| Baseline freeze | HEAD `318832d`; branch `feat/platform-expansion-phase-1`; no new consoles |
| Distribution inventory | 72 technical PUBLIC_CANDIDATE / 4 PRIVATE_ONLY / 5 BLOCKED_LEGAL (+ BIOS external slots) — `docs/release/distribution-inventory.md` |
| Source delivery | Build `SOURCE_OFFER_GATE_OK`; recipient **`OFFER_DELIVERY_NOT_VERIFIED`**; require-public **FAIL** |
| Catalog product approval | **53 pending / 0 approved** — `docs/release/product-approval-matrix.md` |
| Android physical | **`ANDROID_PHYSICAL_BLOCKED_EXTERNAL`** (adb empty) |
| iOS physical | **`IOS_PHYSICAL_BLOCKED_EXTERNAL`** (no device/tools) |
| Security | FrameAdapter origin checks; path-scoped CSP; shell **no** `unsafe-eval`; runtime eval narrowly scoped |
| Private RC | `docs/release/release-candidate-manifest.md` — LOCAL_FULL engineering only |
| GO/NO-GO | ENGINEERING/REPRO/SECURITY **PASS**; SOURCE **NOT_VERIFIED**; CATALOG **PENDING_APPROVAL**; ANDROID/IOS **BLOCKED_EXTERNAL**; PUBLIC_DISTRIBUTION **FAIL** → **PUBLIC_RELEASE_GO = STOP** |
| Evidence | `.runtime/test-evidence/PH-13/` |
| Push / merge / deploy | **Not performed** |

### Next concrete task (PH-13)

1. Owner/counsel: product approvals + corresponding-source HTTPS delivery → re-run require-public gate
2. QA: connect real Android + iOS; complete OS-level PWA install / offline cold-start checklists
3. Keep PUBLIC_RELEASE_GO = STOP until all mandatory gates PASS
4. Optional eng: native Flycast `.m3u` content boot (still NOT_VERIFIED)

## PH-14 actionable blockers (2026-11-04)

| Check | Result |
|---|---|
| Baseline freeze | HEAD was `8a70f45`; ancestor `318832d`; dirty=0; classifications preserved |
| Source package | `SOURCE_PACKAGE_BUILT` + mock `OFFER_ARCHIVE_INTEGRITY_OK` via `prepare-source-offer-delivery.py` |
| Source recipient HTTPS | **NOT_VERIFIED** / host **BLOCKED_EXTERNAL** |
| Legal review pack | 81 JSON/CSV entries; counsel approvals **0** — `docs/release/legal-review/` |
| Product approval queue | 53 pending / 0 approved — export only; workflow validated |
| Staging HTTPS | **BLOCKED_EXTERNAL** |
| Android / iOS | **BLOCKED_EXTERNAL**; executable instructions added |
| Validation newly run | core-lock; public-source; source-offer; Django 43; Vitest 85; tsc |
| Soak/CHD | Prior evidence retained; **not** re-executed as new PH-14 PASSes |
| PUBLIC_RELEASE_GO | **STOP** |

### Next concrete task (PH-14)

1. Ops: authorized HTTPS source-offer host → `--require-public-delivery` PASS
2. Counsel: decisions on `legal-review/` pack (do not auto-approve)
3. Product owner: per-title approvals via Admin/`approve_for_product` (no bulk automation)
4. Ops: staging HTTPS cutover; QA: physical Android/iOS checklists
5. Keep PUBLIC_RELEASE_GO = STOP

## Main integration (2026-11-04/05)

| Check | Result |
|---|---|
| Merge | `--no-ff` `feat/platform-expansion-phase-1` → `main` as `d650bf4` |
| Contains | `b53e66d` handoff + PH-12…14 lineage |
| Skipped | `backup/pre-strip-cursor-coauthor` (parallel superseded history) |
| Regressions | Vitest 85, tsc, Next build, Django 43, multi-core smokes + CHD/GDI/FDS PASS |
| Auditor | `PUBLIC_RELEASE_GO=STOP` exit 1 |
| Push | **Not performed** |

### Next concrete task (on `main`)

1. Owner: fill live `authorized-reviewers.json` + `owner-attestations.json` from PH-20 templates/manifests (18 OA groups) — do not forge
2. Counsel: fill live `counsel-decisions.json` for 52 `CD-RG-*` groups (+ legacy CS-* pack); address 3 unresolved flags — do not forge
3. Re-run `validate-human-approvals.py` + `check-public-source-mirror-ready.py` after real decisions; rebuild Option B mirror only when `PUBLIC_SOURCE_MIRROR_READY=PASS`
4. Owner: authorize Option B destination repo only after mirror gate PASS; never flip private GitHub visibility
5. Keep `PUBLIC_RELEASE_GO=STOP` and `GITHUB_SOURCE_PUSH_READY=NOT_CLEARED` until independent clearances

## PH-16 sanitized history candidate (2026-11-05)

| Check | Result |
|---|---|
| Original `main` | `24b8c55` unchanged |
| Candidate | `e881502` (isolated clone only) |
| Tip tree parity | Identical 1063 paths / 0 SHA mismatches |
| History auditors | `HISTORY_AUDIT_PASS` / public-source safety PASS |
| Tests | Vitest 85, tsc, eslint, Django 43 on candidate |
| Backup | Verified bundle outside repo (`…-ph16-backup-20261105T080855Z`) |
| Origin exposure | Restricted cores still on private `origin/main` + `origin/feat` |
| Push / rewrite | **Not performed** |

## Remaining blockers / next

1. Owner: authorize Option B public repo push of **sanitized** candidate only (LICENSE enacted); re-audit published remote before clearing `GITHUB_SOURCE_PUSH_READY`
2. Counsel: legal-review package; `NEEDS_LEGAL_REVIEW` ≠ approval — use `docs/release/legal-review/`
3. Owner: publish corresponding-source offer on HTTPS; gate must fetch PASS before `OFFER_DELIVERY_VERIFIED`
4. Product: Alpha game set approvals (incl. Atari ST / FDS / Atari 8-bit / N64/ZX81 fixtures if desired)
5. Resolve CS for `virtualjaguar_js` (`81_eo` patch + rebuild notes now packaged); Hatari/EmuTOS/atari800 CS pins recorded
6. QA: physical gamepad + iOS + Android re-cert; Ops: staging HTTPS
7. Playwright offline ≠ physical-device offline certification (document only)
8. Continue PH-12.1 Jaguar (only remaining 12.1 EXPERIMENTAL)
9. Vectrex: BLOCKED_EXTERNAL until authorized `system.img` + gameplay/offline gates
10. Atari 8-bit: optional `.car`/`.cas`/multi-disk + 400/800 profile smokes after real validation; OS PWA/physical NOT_VERIFIED
11. Dreamcast: Compose CHD offline + clean soak closed; product approval pending; optional native M3U content boot
12. PH-14: PUBLIC_RELEASE_GO remains STOP — see `docs/release/blocker-registry.md`
