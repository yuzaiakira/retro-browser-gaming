# Sega 32X feasibility — 2026-10-21

## Verdict

**BLOCKED_LEGAL (core redistribution)** — EmulatorJS `picodrive` is the documented default `sega32x` core, but PicoDrive’s upstream license is a MAME-style **non-commercial** license (`COPYING`: redistributions may not be sold or used in a commercial product or activity). This production launcher must not vendor PicoDrive WASM into the shipped core tree without an explicit legal exception.

Technical EmulatorJS wiring for `sega32x` → `picodrive` already exists in upstream EmulatorJS source, but **`picodrive-*.data` is not present** in the pinned `ejs-4.2.3` core package lock used by this repo.

## Legal fixture candidate (ROM only)

| Candidate | License | Notes |
| --- | --- | --- |
| `haroldo-ok/wave-rider-gp-32x` `release/wave-rider-gp.32x` | MIT | Interactive 32X homebrew; SHA-256 documented upstream as `e1666cd4…`. **Not integrated** because the required core cannot be redistributed under current product constraints. |
| `Dasutin/32X240pTestSuite` | GPL-2.0 | Calibration suite; secondary fixture option if a redistributable core appears. |

Do **not** use commercial 32X ROMs or Virtua Racing dumps.

## What would unlock VERIFIED_PLAYABLE

1. Product/legal approval to ship PicoDrive under non-commercial terms **or** a replacement 32X-capable core with a compatible license (GPL/MIT/Apache, etc.).
2. Pin core bytes into `docs/core-package-lock.json` with provenance.
3. Catalog console `sega-32x`, adapter registration, control scheme `sega32x`, legal `.32x` fixture, Chromium gameplay + offline cold-start evidence.

## Status in matrix

Keep **PLANNED → BLOCKED_LEGAL** until (1) is resolved. No feature-flagged public catalog release.
