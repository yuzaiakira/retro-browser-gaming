# Physical device acceptance checklist (mandatory P0)

Automated Playwright results are **not** physical verification. Complete each row on real hardware and attach dated notes/screenshots under `docs/test-evidence/PH-08/`.

| ID | Scenario | Device | Pass criteria | Status |
|---|---|---|---|---|
| IN-002-P | Physical gamepad connect | USB/BT controller + Chromium | Buttons map; character/menu responds | NOT_VERIFIED |
| IN-002-D | Physical gamepad disconnect mid-play | Same | Pressed state released; no stuck input | NOT_VERIFIED |
| IN-003-P | Multitouch dpad+action | Android Chrome | Simultaneous Left + A registered | NOT_VERIFIED |
| IN-004-P | Custom touch layout survives reload | Android Chrome | Position/size/opacity retained after reload | NOT_VERIFIED |
| IN-005-P | App blur / tab switch | Android or desktop | Inputs released on hide | NOT_VERIFIED |
| UX-FS | Fullscreen enter/exit | Phone or desktop | Emulator continues; layout usable | NOT_VERIFIED |
| UX-OR | Orientation change | Phone | Portrait↔landscape; controls remain usable | NOT_VERIFIED |
| AUD-001 | Real audio output | Any with speakers/headphones | Audible emulator/HTML5 audio (Orbit has no audio; use Genesis/PS1/PSP) | NOT_VERIFIED |
| IOS-001 | iOS Safari catalog + offline | Real iPhone/iPad | Catalog, install, offline library; note COOP/COEP/SAB limits for PSP | NOT_VERIFIED |

## Session log

| Date | Tester | Device | Result | Notes |
|---|---|---|---|---|
| 2026-10-20 | automated agent | none attached | blocked | No gamepad, phone, or iOS device on this workstation |

## How to run

1. Open Compose web (`http://127.0.0.1:13000` or deployed URL) on the device.
2. Install MIT Genesis Breakout (audio + keyboard) and Orbit Catch (touch).
3. Walk the table; capture screenshots named `physical-<id>-YYYYMMDD.png`.
4. Update this file’s Status column and `docs/acceptance-matrix.md` only when a row truly passed.
