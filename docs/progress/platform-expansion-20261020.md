# Platform expansion notes — 2026-10-20

## Consolidated status (single roadmap)

| Target | Priority | Status |
|---|---|---|
| Genesis / SMS / GG / PS1 / PSP | P0 | VERIFIED (prior) |
| NES / SNES / GB / GBC / GBA | P1 | VERIFIED (`9d6c490`) |
| Atari 2600 | P1 | **DONE** — `stella2014` + MIT Berta; catalog offline |
| PC Engine HuCard | P1 | **DONE** — `mednafen_pce` + GPL HuC scroll; **not CD** |
| SG-1000 | P1 | **FEASIBLE** on `smsplus`; blocked on redistributable license |
| J2ME | P1 | **BLOCKED** — no RMS / no legal offline PoC |
| PCE CD / Sega CD / higher | P1–P2 | Unchanged — need multi-file/BIOS policy |

## Architecture notes

- New cores in lock (65): `stella2014`, `mednafen_pce`.
- `frame.js` schemes: `stella2014→atari2600`, `mednafen_pce→pce`; SG would reuse `smsplus→segaMS`.
- `smsplus` seed extensions widened to `["sms","sg"]` for future SG fixture.
- Do not treat Master System evidence as SG-1000 proof.

## Deferred physical

IN-002 / IOS-001 remain BLOCKED_EXTERNAL and still block complete P0.
