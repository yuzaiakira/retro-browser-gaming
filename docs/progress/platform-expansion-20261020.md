# Platform expansion notes — 2026-10-20 / 2026-10-21

## Consolidated status (single roadmap)

| Target | Priority | Status |
|---|---|---|
| Genesis / SMS / GG / PS1 / PSP | P0 | VERIFIED (prior) |
| NES / SNES / GB / GBC / GBA | P1 | VERIFIED (`9d6c490`) |
| Atari 2600 / PCE HuCard / SG-1000 / WonderSwan | P1 | VERIFIED |
| Atari 7800 / Lynx / NGP / NGPC | P1 | VERIFIED (`26a460b`) |
| MS-DOS | P1 | **DONE** — `jsdos` (emulators 8.3.8) + MIT Floppy Bird; not `dosbox_pure` |
| EmulatorJS `dosbox_pure` | P1 research | **BLOCKED** on 4.2.3 OpenGL/GLES + OOB (cores remain pinned) |
| J2ME | P1 | **BLOCKED** — RMS+IDB durable; no MIDlet gameplay |
| ColecoVision | P2 | **BLOCKED** — proprietary OS-7 BIOS |
| PCE CD / Sega CD / higher | P1–P2 | Unchanged — need multi-file/BIOS policy |

## Architecture notes

- Core lock **86**: EmulatorJS package (incl. unused `dosbox_pure`) + `jsdos-8.3.8/*`.
- DOS uses `/runtime/dos-frame.html` + `FrameAdapter` branch on `core==='jsdos'`.
- `dosbox_pure` BOOTUP.BAT backport is in vendored EJS `GameManager.js` / `emulator.js` for research; still does not yield playable start.
- `spikes/j2me-rms/` research-only (Node + IDB); not imported by the web app production bundle.

## Deferred physical

IN-002 / IOS-001 remain BLOCKED_EXTERNAL and still block complete P0.
