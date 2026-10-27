# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** (product/device/staging gates unchanged).  
**Player UX (PH-UX):** immersive PlayerShell + Gameplay UX Reliability — verified 2026-10-26.  
**Hub UX (PH-UX-HUB):** Premium Gaming Hub — verified 2026-10-26.  
**Hub UX Acceptance (Sprint 3.1):** offline persistent-profile journey, catalog Back/Forward history, Continue Playing accuracy, stable hub shots — verified 2026-10-26.  
**Sprint 4 Personalization:** per-release prefs, shell display modes, shortcuts, save manager, HUD comfort — verified 2026-10-27.  
**Open-source prep:** source-offer gate verifies **every** `SHA256SUMS` entry; `--require-public-delivery` for prod GPL serving; LOCAL_FULL needs `RBG_ALLOW_LOCAL_FULL=1`; MIT LICENSE proposed (not enacted). Sanitized candidate `77110c5` ← private `501ed79` (re-filter after newer tip before push). **STOP** before GitHub publish.

## Deferred physical / external (do not rediscover)

- IN-002-P / IN-002-D — no gamepad (`docs/physical-device-acceptance.md`)
- IOS-001 — no iOS device (same)
- Staging HTTPS — no authorized staging (`docs/production-staging-verification.md`)

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + NDS + MSX |
| EXPERIMENTAL | ZX81 / Jaguar / N64 |
| FBNeo | BLOCKED_FIXTURE |
| Atari ST | BLOCKED_CORE — hatari absent |
| Core lock | **373 files** |

## Player UX pass (2026-10-26)

| Check | Result |
|---|---|
| Acceptance gates (IN/SAV/EMU/CAT/SEC) | `ACCEPTANCE_GATES_PASS` → `docs/test-evidence/PH-UX/acceptance-gates-20261026.txt` |
| Player UX Playwright | `PLAYER_UX_PASS` → `docs/test-evidence/PH-UX/player-ux-20261026.txt` |
| Screenshots | `docs/test-evidence/PH-UX/screenshots/` (desktop shell, game menu, mobile portrait/landscape) |
| Genesis smoke | `GENESIS_GAMEPLAY_PASS` |
| MSX smoke | `MSX_GAMEPLAY_PASS` |
| Vitest / typecheck | 23 passed / `tsc --noEmit` OK |

## Gameplay UX reliability pass (2026-10-26 evening)

| Check | Result |
|---|---|
| Input suspension + change-based dispatch (unit) | 6 InputRouter tests pass |
| Player UX reliability E2E | `PLAYER_UX_PASS` → `docs/test-evidence/PH-UX/player-ux-reliability-20261026.txt` (+ `.json`) |
| Perf evidence | held key presses=1 releases=1; menu-open pad events=0 |
| Genesis quick save/load/reload + pause→reset | PASS in reliability suite |
| Acceptance gates | `ACCEPTANCE_GATES_PASS` → `docs/test-evidence/PH-UX/acceptance-gates-reliability-20261026.txt` |
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
| Hub Playwright journeys + responsive | `HUB_UX_PASS` → `docs/test-evidence/PH-UX-HUB/` |
| Player UX reliability (regression) | `PLAYER_UX_PASS` |
| Genesis smoke | `GENESIS_GAMEPLAY_PASS` |
| Vitest / typecheck | 30 passed / `tsc --noEmit` OK |

## Sprint 3.1 Hub UX acceptance (2026-10-26 late)

| Check | Result |
|---|---|
| Hub UX (history Back/Forward, Continue Playing, slow/error catalog, responsive) | `HUB_UX_PASS` → `docs/test-evidence/PH-UX-HUB/hub-ux-sprint31-20261026.txt` |
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
| Player personalization E2E | `PLAYER_PERSONALIZATION_PASS` → `docs/test-evidence/PH-UX-PERSONALIZE/` |
| Player UX reliability regression | `PLAYER_UX_PASS` (Orbit/Genesis/MSX/mobile) |
| Typecheck | `tsc --noEmit` OK |
| Architecture | Prefs keyed by release id; Fit/Original shell CSS; integer scaling disabled honestly; no emulator remount on display change |
| Limitations | No native framebuffer → no integer scaling; gamepad menu nav is simulated Start/Select only; physical gamepad NOT_VERIFIED |

## Remaining blockers / next

1. Owner: confirm copyright holder + authority; enact MIT root LICENSE only then
2. Owner: authorize Option B public repo push of sanitized candidate
3. Counsel: legal-review package; `NEEDS_LEGAL_REVIEW` ≠ approval
4. Owner: publish corresponding-source offer on HTTPS; gate must fetch PASS before `OFFER_DELIVERY_VERIFIED`
5. Product: Alpha game set approvals
6. Resolve CS for `81_eo` / `virtualjaguar_js`
7. QA: physical gamepad + iOS; Ops: staging HTTPS
8. Playwright offline ≠ physical-device offline certification (document only)
