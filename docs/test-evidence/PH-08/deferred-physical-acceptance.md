# Deferred physical acceptance (external hardware)

Owner decision (2026-10-20): **no physical USB/Bluetooth gamepad** and **no iPhone/iPad** are available for this milestone. These PDR rows stay mandatory and are **not** PASSED. They are deferred to a future physical-verification milestone so development can continue without inventing evidence.

## Deferred rows

| ID | Requirement | Status | Prerequisite | Future test instructions |
|---|---|---|---|---|
| IN-002-P | Physical gamepad connect + mapping | **BLOCKED_EXTERNAL** | USB or Bluetooth controller visible to Chromium (`navigator.getGamepads` / `/dev/input/js*` when applicable) | Attach controller → `/diagnostics` shows gamepad available → play MIT Genesis Breakout → D-pad/face buttons move/act in-game → screenshot + dated note under `PH-08/`. |
| IN-002-D | Disconnect mid-hold releases pressed state | **BLOCKED_EXTERNAL** | Same controller as IN-002-P | Hold a direction/face button → unplug/disconnect while held → confirm no stuck input (character stops; no phantom presses) → dated note. |
| IOS-001 | Real iOS Safari catalog, install, offline | **BLOCKED_EXTERNAL** | Physical iPhone/iPad or authorized real-device lab with Safari | Open HTTPS or trusted LAN origin → catalog browse → install legal title if OPFS available → offline cold-start after Safari restart → note PSP SAB/COI limits → **never** substitute Playwright WebKit. |

## Explicit non-actions

- Do **not** mark these PASSED from mocks, desktop Gamepad API simulation, or Playwright WebKit.
- Do **not** remove them from `docs/PDR.md` or downgrade them from mandatory acceptance.
- Do **not** repeatedly rediscover missing gamepad/iOS hardware on this workstation.
- Do **not** block independently executable platform expansion or RC documentation on these rows.

## When hardware arrives

1. Update `docs/test-evidence/PH-08/physical-acceptance-checklist.md` and this file with dated PASS/FAIL only after real runs.
2. Update `docs/acceptance-matrix.md`, `docs/EMULATOR_SUPPORT_MATRIX.md`, and `docs/EXECUTION_STATE.md`.
3. Keep Android PH-08 evidence that already PASSED (including AUD-001) intact.
