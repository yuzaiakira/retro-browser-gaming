# ColecoVision / gearcoleco feasibility — 2026-10-20

## Technical path

EmulatorJS 4.2.3 ships `gearcoleco`. MIT RetroPIPE provides `retropipe_v0-2-0_cv.rom` (legal game ROM).

## Blocker

Libretro Gearcoleco requires non-optional firmware `colecovision.rom` (ColecoVision / ADAM OS-7 BIOS). That BIOS is proprietary and is **not** redistributed here.

## Decision

Do not vendor `gearcoleco` cores or seed ColecoVision until a redistributable BIOS policy exists (or an open BIOS substitute is verified). Game ROM alone is insufficient.
