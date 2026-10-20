# Acceptance gates CAT/EMU/IN/SAV/SEC — 2026-10-20

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node tests/acceptance-gates.cjs
```

## Passed (automated Chromium)

| ID | Result |
|---|---|
| CAT-002 | Empty search, API abort notice, `/offline` page |
| EMU-005 | Three exit/re-enter cycles; single game iframe |
| EMU-006 | Unsupported core shows clear failure UX |
| IN-001 | ArrowLeft → libretro command 6 via InputRouter (`retro-input` event) |
| IN-002 | Simulated Gamepad API D-pad left |
| IN-003 | Simultaneous Touch Left + Touch A |
| IN-004 | Touch layout persisted in IndexedDB across reload |
| IN-005 | Blur clears pressed state |
| SAV-002 | Delete game files; saves retained |
| SAV-003 | Invalid import checksum rejected; prior save unchanged |
| SEC-004 | Sandboxed hostile HTML denied IndexedDB (`SecurityError`) |

## Explicitly not physical

- Gamepad / multitouch / orientation / audio on real devices → `PH-08/physical-acceptance-checklist.md`
