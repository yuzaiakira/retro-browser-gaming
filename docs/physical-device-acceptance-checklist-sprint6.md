# Physical device acceptance checklist (Sprint 6)

Status: **BLOCKED_EXTERNAL** — no physical gamepad or iOS device attached in this session.

Simulated Playwright Gamepad API results are **not** physical certification.

## Physical gamepad (IN-002-P / IN-002-D)

When a real controller is connected to Chromium/Firefox:

1. [ ] Controller appears in Settings / gamepad status chip as connected
2. [ ] Hub: D-pad moves focus; Start/A confirms; Select/B backs
3. [ ] Open Game Menu during Genesis play — face button A held in-game must **not** click menu items (Start/Select only)
4. [ ] Disconnect mid-hold — no stuck direction/button in emulator
5. [ ] Reconnect — require neutral before menu actions
6. [ ] Confirm dialogs: Cancel preferred for destructive; Confirm requires explicit press

Record: OS, browser version, pad vendor/id, date, tester.

## iOS Safari (IOS-001)

1. [ ] Install PWA / add to home screen if applicable
2. [ ] Offline cold start of Library with installed Genesis
3. [ ] Play + Quick save/load if saveState available
4. [ ] Touch controls + orientation
5. [ ] Audio gesture unlock

## Android physical (optional)

1. [ ] Same journeys as desktop Chromium on device Chrome
2. [ ] Multitouch + landscape PlayerShell

Do not mark these PASSED without the hardware evidence above.
