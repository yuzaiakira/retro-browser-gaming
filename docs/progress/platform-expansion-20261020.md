# Platform expansion notes — 2026-10-20

## Consolidated status (single roadmap)

| Target | Priority | Status |
|---|---|---|
| Genesis / SMS / GG / PS1 / PSP | P0 | VERIFIED (prior) |
| NES / SNES / GB / GBC / GBA | P1 | VERIFIED (`9d6c490`) |
| Atari 2600 | P1 | **DONE** — `stella2014` + MIT Berta |
| PC Engine HuCard | P1 | **DONE** — `mednafen_pce` + GPL HuC scroll; **not CD** |
| SG-1000 | P1 | **DONE** — `smsplus` + MIT RetroPIPE (distinct from SMS) |
| J2ME | P1 | **BLOCKED** — no RMS / no legal offline PoC |
| PCE CD / Sega CD / higher | P1–P2 | Unchanged — need multi-file/BIOS policy |

## Architecture notes

- Cores in lock (65): includes `stella2014`, `mednafen_pce`.
- `frame.js` schemes: `stella2014→atari2600`, `mednafen_pce→pce`; SG uses `smsplus→segaMS`.
- `smsplus` extensions `["sms","sg"]`; SG catalog console `sega-sg1000`.
- Do not treat Master System evidence as SG-1000 proof (separate fixture + offline runs).

## Deferred physical

IN-002 / IOS-001 remain BLOCKED_EXTERNAL and still block complete P0.
