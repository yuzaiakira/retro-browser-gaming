# Platform expansion notes — 2026-10-20 / 2026-10-21

> **Historical snapshot.** Rows below captured mid-expansion status on 2026-10-20/21 and are **not** the live project status.
> Authoritative current status: `docs/EXECUTION_STATE.md`, `docs/EMULATOR_SUPPORT_MATRIX.md`, `docs/RELEASE_CANDIDATE.md`.
>
> Known stale claims in the original table (superseded):
> - J2ME is no longer BLOCKED — dedicated-origin js2me is VERIFIED_PLAYABLE (see PH-06).
> - Core lock is **333** files (not 86).
> - MS-DOS `jsdos`, NGP/NGPC, and further catalog titles have landed since this note.

## Consolidated status (single roadmap) — as of note date

| Target | Priority | Status (historical) |
|---|---|---|
| Genesis / SMS / GG / PS1 / PSP | P0 | VERIFIED (prior) |
| NES / SNES / GB / GBC / GBA | P1 | VERIFIED (`9d6c490`) |
| Atari 2600 / PCE HuCard / SG-1000 / WonderSwan | P1 | VERIFIED |
| Atari 7800 / Lynx / NGP / NGPC | P1 | VERIFIED (`26a460b`) |
| MS-DOS | P1 | **DONE** — `jsdos` (emulators 8.3.8) + MIT Floppy Bird; not `dosbox_pure` |
| EmulatorJS `dosbox_pure` | P1 research | **BLOCKED** on 4.2.3 OpenGL/GLES + OOB (cores remain pinned) |
| J2ME | P1 | **historical BLOCKED row** — superseded by dedicated-origin VERIFIED_PLAYABLE |
| ColecoVision | P2 | **BLOCKED** — proprietary OS-7 BIOS |
| PCE CD / Sega CD / higher | P1–P2 | Unchanged — need multi-file/BIOS policy |

## Architecture notes (historical)

- Core lock **86** at note time; current lock is **333** (EmulatorJS + jsdos + js2me).
- DOS uses `/runtime/dos-frame.html` + `FrameAdapter` branch on `core==='jsdos'`.
- `dosbox_pure` BOOTUP.BAT backport is in vendored EJS `GameManager.js` / `emulator.js` for research; still does not yield playable start.
- `spikes/j2me-rms/` research-only (Node + IDB); not imported by the web app production bundle.

## Deferred physical

IN-002 / IOS-001 remain BLOCKED_EXTERNAL and still block complete P0.
