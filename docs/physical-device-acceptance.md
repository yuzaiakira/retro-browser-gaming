# Physical device acceptance runbook

**Status (2026-10-22):** IN-002-P / IN-002-D and IOS-001 remain **BLOCKED_EXTERNAL** on this workstation. Android Chrome PH-08 (including AUD-001) already **PASSED** — see `docs/qa/` and `docs/qa-summary.md`.

Canonical deferred note: `docs/qa/deferred-physical-acceptance.md`.  
Checklist table: `docs/qa/physical-acceptance-checklist.md`.

---

## IN-002-P / IN-002-D — physical gamepad

### Prerequisites

| Item | Requirement |
| --- | --- |
| Hardware | USB or Bluetooth gamepad visible to the OS (`/dev/input/js*` and/or Chromium Gamepad API) |
| Browser | Desktop Chromium (or Android Chrome with OTGs/BT pad) against the running launcher origin |
| Software | Compose stack healthy; seed with `--with-console-fixtures`; MIT Genesis Breakout installed |
| Role | QA / release engineer with the physical controller |

### Software already verified (not a substitute for physical)

| Check | Result | Evidence |
| --- | --- | --- |
| InputRouter Gamepad poll + mapping | Implemented | `apps/web/src/features/input.ts` |
| Simulated Gamepad API (IN-002) | PASS | `PH-11/acceptance-gates-20261022.txt` (`IN_002_SIMULATED_GAMEPAD_PASS`) |
| Blur / visibility release (IN-005) | PASS | Same file |
| Keyboard mapping (IN-001) | PASS | Same file |

Do **not** mark IN-002-P/D PASSED from simulated Gamepad API alone.

### Procedure (IN-002-P)

1. Attach controller; confirm Chromium `navigator.getGamepads()` shows a non-null pad (Diagnostics page if available).
2. Open `http://launcher.localhost:13000/games/mit-genesis-breakout` (or staging HTTPS equivalent).
3. Install if needed → Play.
4. Exercise D-pad / left stick and face buttons; confirm in-game movement and actions.
5. Record: OS, browser version, controller model, connection method, dated screenshots under `docs/qa/`.

**Expected:** Buttons map; character/menu responds; no phantom presses when idle.

**Fail if:** No pad detected; inputs ignored; wrong mapping with no Settings remapping path; stuck directions.

### Procedure (IN-002-D)

1. Hold a direction or face button in-game.
2. Unplug / disconnect BT while held.
3. Confirm pressed state clears (no continuous movement / stuck fire).

**Expected:** Inputs release on disconnect.

**Fail if:** Stuck input until page reload.

### Remediation

- Mapping bugs → `InputRouter` / emulator control scheme (`segaMD` etc.).
- Detect-only failures → browser permissions / HID / BT pairing.
- Owner: frontend + QA.

---

## IOS-001 — real iOS Safari

### Prerequisites

| Item | Requirement |
| --- | --- |
| Hardware | Physical iPhone/iPad **or** authorized real-device lab (not Playwright WebKit) |
| Origin | HTTPS (trusted) or LAN trusted profile matching production-like headers |
| Role | QA with iOS device |

### Explicit non-equivalents

- Playwright WebKit / desktop Safari ≠ IOS-001.
- Prior WebKit capability gate (`PH-02/webkit-orbit-capability-*`) correctly disables install when OPFS is absent — that is capability honesty, **not** iOS PASS.

### Procedure

1. Open launcher origin in Safari; confirm catalog lists expected titles (engineering host or product-approved staging).
2. Note capability messaging (OPFS / Web Locks / SharedArrayBuffer).
3. If OPFS available: install a legal engineering title → Ready Offline.
4. Force-quit Safari → reopen → cold-start offline play.
5. Exercise touch controls; rotate orientation; try fullscreen (document limitations).
6. Background Safari → resume; confirm save persistence where supported.
7. Attempt PSP only if COI/SAB available; otherwise record unsupported honestly.
8. Capture screenshots + written notes under `docs/qa/`ios-*`.

**Expected:** Catalog usable; install/offline behavior matches capability messages; no false Ready Offline.

**Fail if:** Crash loops; silent install success without storage; claimed PSP on non-COI Safari.

### Remediation

- Capability false-positives → `compatibility` feature.
- Offline gaps → SW / OPFS paths.
- Owner: frontend + QA.

---

## Workstation check (2026-10-22)

``text
/dev/input/js* — absent
lsusb — no dedicated gamepad HID (REDRAGON/Compx receivers present; not accepted as gamepad evidence)
iOS device — unavailable
``

Classification unchanged: **BLOCKED_EXTERNAL**.
