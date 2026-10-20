# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** — Android PH-08 including human-heard **AUD-001** PASSED on USB Chrome; physical gamepad and real iOS Safari remain open.

## Device discovery (2026-10-20, rediscovered)

- `adb` at `/usr/bin/adb`; authorized USB device `device` (model `2303CRA44A`, Android 15).
- Chrome `155.0.8059.39`; CDP via `chrome_devtools_remote`; reverse `13000`/`18000`.
- No joystick nodes; no iOS (`idevice_id` empty).
- Evidence: `PH-08/android-device-discovery-20261020.md`.

## Android physical acceptance

| ID | Status | Evidence |
|---|---|---|
| IN-003-P | PASSED | Simultaneous Left+A (`android-physical-20261020.txt`) |
| IN-004-P | PASSED | Touch layout retained after reload |
| IN-005-P | PASSED | Blur/visibility release on device Chrome |
| UX-FS | PASSED | Fullscreen enter/exit on player stage |
| UX-OR | PASSED | Portrait → landscape via fullscreen + orientation.lock |
| Offline cold-start | PASSED | Reverse removed; API unreachable; 4 READY OFFLINE; offline play (`android-offline-cold-20261020.txt`) |
| Genesis / PS1 / PSP install+play | PASSED | Same physical suite on phone |
| AUD-001 | **PASSED** | Human heard Genesis Breakout on phone speakers after `segaMD` fix (`aud001-human-listen-20261020.md`) |
| IN-002-P/D | BLOCKED_EXTERNAL | No gamepad |
| IOS-001 | BLOCKED_EXTERNAL | No iOS device |

## Runtime fix shipped with AUD-001

- `frame.js`: force `EJS_controlScheme` per core (`genesis_plus_gx` → `segaMD`); disable EmulatorJS virtual-gamepad/fast-forward by default.
- Shell cache `retro-shell-v4` so phones pick up the new runtime assets.

## Remaining external blockers

1. Physical gamepad (IN-002-P/D)
2. Real iOS Safari (IOS-001) — never substitute Playwright WebKit

## Next action

1. Attach a gamepad when available for IN-002-P/D.
2. Attach iOS hardware or an authorized real-device lab for IOS-001.
3. Do not re-loop Android discovery while the same USB device remains authorized.
