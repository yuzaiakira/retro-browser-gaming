# Platform expansion notes — 2026-10-20

## Consolidated status (single roadmap)

| Target | Priority | Status |
|---|---|---|
| Genesis / SMS / GG / PS1 / PSP | P0 | VERIFIED (prior) |
| NES / SNES / GB / GBC / GBA | P1 | VERIFIED (`9d6c490`) |
| Atari 2600 | P1 | **DONE** — `stella2014` + MIT Berta |
| PC Engine HuCard | P1 | **DONE** — `mednafen_pce` + GPL HuC scroll; **not CD** |
| SG-1000 | P1 | **DONE** — `smsplus` + MIT RetroPIPE |
| WonderSwan | P1 | **DONE** — `mednafen_wswan` + MIT chips1 |
| Atari 7800 | P1 | **DONE** — `prosystem` + GPL rfk7800 |
| Atari Lynx | P1 | **DONE** — `handy` + MIT lynx-dot |
| Neo Geo Pocket | P1 | **DONE** — `mednafen_ngp` + GPL joypad (mono) |
| Neo Geo Pocket Color | P1 | **DONE** — `mednafen_ngp` + GPL test (Color; separate evidence) |
| MS-DOS | P1 | **SPIKE** — cores pinned (lock 80); Floppy Bird fails start (`PH-05/dos-dosbox-pure-spike-20261020.md`) |
| J2ME | P1 | **BLOCKED** — isolated RMS PoC green; no VM/offline gameplay |
| ColecoVision | P2 | **BLOCKED** — proprietary OS-7 BIOS (`PH-05/coleco-gearcoleco-bios-blocker-20261020.md`) |
| PCE CD / Sega CD / higher | P1–P2 | Unchanged — need multi-file/BIOS policy |

## Architecture notes

- Core lock **80**: 77 console cores + threaded `dosbox_pure` (+ legacy/report).
- `frame.js` schemes: `prosystem→atari7800`, `handy→lynx`, `mednafen_ngp→ngp`; experimental `dosbox_pure→dos` + threads (not production-supported).
- `preferSeekable` returns false for `prosystem` / `handy` / `mednafen_ngp` (blob URL) so `simulateInput` works; other cores retain seekable VFS.
- Keep NGP vs NGPC catalog identities separate; keep WonderSwan mono vs Color distinct if Color is added later.
- `spikes/j2me-rms/` is research-only; not imported by the web app.

## Deferred physical

IN-002 / IOS-001 remain BLOCKED_EXTERNAL and still block complete P0.
