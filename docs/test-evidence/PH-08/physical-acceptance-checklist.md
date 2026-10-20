# Physical device acceptance checklist (mandatory P0)

Automated Playwright results are **not** physical verification. Complete each row on real hardware and attach dated notes/screenshots under `docs/test-evidence/PH-08/`.

| ID | Scenario | Device | Pass criteria | Status |
|---|---|---|---|---|
| IN-002-P | Physical gamepad connect | USB/BT controller + Chromium | Buttons map; character/menu responds | **BLOCKED_EXTERNAL** — no `/dev/input/js*` on 2026-10-20 |
| IN-002-D | Physical gamepad disconnect mid-play | Same | Pressed state released; no stuck input | **BLOCKED_EXTERNAL** — no controller |
| IN-003-P | Multitouch dpad+action | Android Chrome | Simultaneous Left + A registered | **BLOCKED_EXTERNAL** — no `adb`/device |
| IN-004-P | Custom touch layout survives reload | Android Chrome | Position/size/opacity retained after reload | **BLOCKED_EXTERNAL** — no phone |
| IN-005-P | App blur / tab switch | Android or desktop | Inputs released on hide | **NOT_VERIFIED** — needs human desktop/phone session (no simulated events) |
| UX-FS | Fullscreen enter/exit | Phone or desktop | Emulator continues; layout usable | **NOT_VERIFIED** — needs human session |
| UX-OR | Orientation change | Phone | Portrait↔landscape; controls remain usable | **BLOCKED_EXTERNAL** — no phone |
| AUD-001 | Real audio output | Speakers/headphones | Human hears Genesis/PS1/PSP audio | **NOT_VERIFIED** — USB audio sink present; human listener required (`audio-gesture` only proves AudioContext) |
| IOS-001 | iOS Safari catalog + offline | Real iPhone/iPad | Catalog, install, offline; note PSP SAB limits | **BLOCKED_EXTERNAL** — `idevice_id` empty |

## Session log

| Date | Tester | Device | Result | Notes |
|---|---|---|---|---|
| 2026-10-20 | automated agent | none for phone/pad/gamepad | blocked | Discovery in `physical-env-prep.md`; C-Media USB audio available for AUD-001 when a human listens |
| 2026-10-20 | automated agent | Playwright WebKit container | N/A | Orbit install disabled: no OPFS (`webkit-orbit-capability-20261020.txt`) |

## How to run (actionable)

1. Attach hardware listed above; follow `physical-env-prep.md`.
2. For Android: `./scripts/physical-android-forward.sh` then Chrome → `http://127.0.0.1:13000/diagnostics`.
3. Install MIT Genesis Breakout (audio) and Orbit Catch (touch).
4. Walk the table; capture `physical-<id>-YYYYMMDD.png`.
5. Update Status only when the scenario truly passed on hardware — never from Playwright mocks.
