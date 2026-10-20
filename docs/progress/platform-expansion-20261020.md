# Platform expansion notes — 2026-10-20

## Feasibility snapshot

| Target | Priority | Status |
|---|---|---|
| Master System / Game Gear / NES | P0/P1 | **DONE** (commit `7656f03` and earlier) |
| SNES (`snes9x`) | P1 | **DONE** — MIT Gothicvania; core + catalog offline |
| Game Boy (`gambatte` + `.gb`) | P1 | **DONE** — first-party MIT Dot; verified separately from GBC |
| Game Boy Color (`gambatte` + `.gbc`) | P1 | **DONE** — MIT Waternet GBC; separate catalog slug |
| GBA (`mgba`) | P1 | **DONE** — MIT Google Dino |
| J2ME | P1 | **BLOCKED** — `PH-06/j2me-for-web-spike-20261020.md` (builds, no CheerpJ, **no RMS**, no legal offline PoC) |
| SG-1000 / SNES-adjacent / Atari | P1–P2 | Next optional |

## Architecture notes from this pass

- Control schemes in `frame.js`: `snes9x→snes`, `gambatte→gb`, `mgba→gba`.
- GB vs GBC share `gambatte` but use **distinct** fixtures, consoles (`gb`/`gbc`), and evidence rows.
- Core lock grown to **59** EmulatorJS 4.2.3 packages from `cdn.emulatorjs.org/4.2.3`.
- Parameterized smoke: `apps/web/tests/libretro-family-smoke.cjs` (`PLATFORM=snes|gb|gbc|gba`).

## Deferred physical

Gamepad IN-002 and iOS IOS-001 remain BLOCKED_EXTERNAL and still block complete P0.
