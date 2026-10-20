# Physical device acceptance checklist (mandatory P0)

Physical evidence requires a real device session. Automated CDP runs against the USB-connected phone count when they exercise the same production origin and code paths (not Playwright desktop mocks).

| ID | Scenario | Device | Pass criteria | Status |
|---|---|---|---|---|
| IN-002-P | Physical gamepad connect | USB/BT controller + Chromium | Buttons map; character/menu responds | **BLOCKED_EXTERNAL** — no `/dev/input/js*` / no controller (2026-10-20 rediscovery) |
| IN-002-D | Physical gamepad disconnect mid-play | Same | Pressed state released; no stuck input | **BLOCKED_EXTERNAL** — no controller |
| IN-003-P | Multitouch dpad+action | Android Chrome | Simultaneous Left + A registered | **PASSED** — dual pointer Left+A on device Chrome CDP (`android-physical-20261020.txt`) |
| IN-004-P | Custom touch layout survives reload | Android Chrome | Position/size/opacity retained after reload | **PASSED** — layout size 58 retained in IDB after reload |
| IN-005-P | App blur / tab switch | Android Chrome | Inputs released on hide | **PASSED** — visibilitychange+blur+pagehide release on physical Chrome session |
| UX-FS | Fullscreen enter/exit | Android Chrome | Emulator continues; layout usable | **PASSED** — `requestFullscreen` on `.player-stage` entered then exited |
| UX-OR | Orientation change | Android Chrome | Portrait↔landscape; controls remain usable | **PASSED** — fullscreen + `orientation.lock` → `landscape-primary` 839×303 |
| AUD-001 | Real audio output | Device speakers | Human hears Genesis/PS1/PSP audio | **NOT_VERIFIED** — AudioContext `running` @ 48 kHz after gesture; **human listen required** |
| IOS-001 | iOS Safari catalog + offline | Real iPhone/iPad | Catalog, install, offline; note PSP SAB limits | **BLOCKED_EXTERNAL** — `idevice_id` empty |

## Android session extras (same PH-08 run)

| Scenario | Result | Evidence |
|---|---|---|
| Diagnostics / secure / OPFS / COI | PASS | `screenshots/android-diagnostics.png` |
| Catalog install Orbit / Genesis / PS1 / PSP | PASS | `android-physical-20261020.txt` |
| Offline cold-start (ADB reverse removed) | PASS | API `:18000` failed; SW served shell; 4 READY OFFLINE; offline Play Orbit (`android-offline-cold-20261020.txt`, `screenshots/android-offline-*.png`) |
| Save state on device | PASS | Orbit + Genesis save during physical suite |

## Session log

| Date | Tester | Device | Result | Notes |
|---|---|---|---|---|
| 2026-10-20 | automated agent | none for phone/pad/gamepad | blocked | Discovery in `physical-env-prep.md`; C-Media USB audio available for AUD-001 when a human listens |
| 2026-10-20 | automated agent | Playwright WebKit container | N/A | Orbit install disabled: no OPFS (`webkit-orbit-capability-20261020.txt`) |
| 2026-10-20 | automated agent | Android 15 + Chrome 155 USB (`2303CRA44A`) | Android PH-08 mostly PASSED | CDP suite + reverse-removed offline; AUD-001 / gamepad / iOS remain |

## How to run (actionable)

1. Attach Android via USB (`adb devices` → `device`); follow `physical-env-prep.md`.
2. `./scripts/physical-android-forward.sh` then Chrome → `http://127.0.0.1:13000/diagnostics`.
3. Forward CDP: `adb forward tcp:9222 localabstract:chrome_devtools_remote`.
4. From `apps/web`: `ANDROID_CDP_URL=http://127.0.0.1:9222 node tests/android-physical.cjs` then `node tests/android-offline-cold.cjs`.
5. For AUD-001: play MIT Genesis Breakout on the phone and confirm audible output (human).
6. Update Status only with dated hardware evidence — never from desktop Playwright mocks alone.
