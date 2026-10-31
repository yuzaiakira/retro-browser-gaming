# Famicom Disk System — open BIOS feasibility (PH-12.2)

Date: 2026-10-31 (updated). Goal: determine whether an open FDS BIOS can lawfully replace Nintendo’s `disksys.rom` for **interactive** FDS titles under pinned FCEUmm WASM — without redistributing proprietary firmware.

## Candidates

| Project | License | Commit audited | Build |
|---------|---------|----------------|-------|
| [jamesathey/FreeDiskSysROM](https://github.com/jamesathey/FreeDiskSysROM) | LGPL-3.0 | `0d5f95f109bb3aadf2bb9510bfda13879bbd5266` | `asm6f freedisksys.asm` → 8192 B |
| [RetrolariumLab/OpenDiskSysROM](https://github.com/RetrolariumLab/OpenDiskSysROM) | LGPL-3.0 (continues FreeDiskSysROM) | `b3cbc00d7c5b252c3c33a7e0f740cae97675ce30` | same |

Assembler pin: [freem/asm6f](https://github.com/freem/asm6f) `fd03633e7bf2612d7485280b291f9089197ae74b` (asm6f 1.6 + f003).

### SHA-256 of built BIOS images

| Artifact | SHA-256 |
|----------|---------|
| FreeDiskSysROM `freedisksys.bin` | `20bc4edc909797fb9d1ed271b5890b6ed55587b96ae4650ed135ed7c90a4c008` |
| OpenDiskSysROM `opendisksys.bin` | `6ce74ea4e9407c8d1175a58b7af08f073fa6b9f9b54e4f4954828ae1b6872ba6` |

LGPL-3.0 text: `LICENSES/OpenDiskSysROM-LGPL-3.0.txt`. Private provision path: `.private-runtime/firmware/fds/disksys.rom` (not a public catalog asset).

## Completeness audit

### FreeDiskSysROM

Disk I/O entry points incomplete relative to a working FDS BIOS. **Not sufficient** for real loads.

### OpenDiskSysROM

README claims every documented entry point implemented. Upstream states MAME `fds` boots commercial titles (not used here). **No Nintendo IP animation.**

## FCEUmm WASM behaviour (verified this pass)

Pinned EmulatorJS `fceumm` 4.2.3:

1. Looks up `disksys.rom` via libretro SYSTEM DIR.
2. When SYSTEM DIR is empty, falls back to **content directory** → `/disksys.rom`.
3. Validates **presence + size (8192)** — does **not** require the Nintendo BIOS hash. OpenDiskSysROM is accepted by size.
4. Without BIOS: `[libretro WARN] FDS BIOS ROM image missing!` + content load failure → RetroArch Ozone menu (must not be mistaken for gameplay).

### Mount wiring (`frame.js`)

For `fceumm` + `.fds`, mount OpenDiskSysROM bytes as:

- `/home/web_user/retroarch/userdata/system/disksys.rom`
- `/disksys.rom` (content-dir fallback)

Pass **Uint8Array** (not `blob:` URL) through `EJS_externalFiles`. EmulatorJS `downloadFile` revokes blob URLs after first fetch; seekable VFS previously skipped mounts when `constructor.name !== "Object"` — GameManager now accepts plain objects and in-memory byte arrays.

## Licensed fixtures

| Asset | License | SHA-256 |
|-------|---------|---------|
| Dreamful / FDS-Diskmag `diskmag.fds` v1.0 | Noncommercial shareware (README terms) | `289e9e1eb5a8ad38284d66bf6429e930d3c2cab8e36513cb9fc0943b27dbb8b4` |
| RBG FDS Move Demo `fds-rbg-move-demo.fds` | MIT (first-party) | `c8b5b2b3f0f8f75112b1fc78269fc991952c0165bf72f6a1514e8562583541a5` |

Dreamful: `.fixtures/fds-dreamful-diskmag.fds` (+ README). **Unsuitable** for interactive gameplay proof — A/B/A shows `leftVsIdle=0` (idle animation dominates).

Move demo: built by `scripts/build-fds-rbg-move-demo.py` (6502 machine code + FDS packer; VECTORS@$DFF6 + BYPASS stub). Left/Right move sprite X; A toggles Y. **Not** catalogued.

## Browser evidence (2026-10-31)

Smoke: `apps/web/tests/fds-opendisksys-smoke.cjs` → `.runtime/test-evidence/PH-12/fds/` (`aba-metrics.json`).

| Gate | Result |
|------|--------|
| OpenDiskSysROM 8192 B reproducible | PASS (`6ce74ea4…`) |
| BIOS mounted before content load | PASS (`/disksys.rom`) |
| Dreamful A/B/A idle vs hold Left/Right | **FAIL** (`inputExceedsIdle=false`) — fixture rejected for gameplay |
| Move-demo A/B/A | **PASS** (`FDS_MOVE_DEMO_INTERACTIVE_PASS`; leftVsIdle/rightVsLeft ≈312) |
| Save/load after input | PASS on move-demo path |
| Catalog FDS | **Remain DISABLED** |
| Full offline cold-start / NES regression | **Open** |
| VERIFIED_PLAYABLE | **No** |

## Decision

| Item | Status |
|------|--------|
| FreeDiskSysROM for real loads | **BLOCKED** |
| OpenDiskSysROM + FCEUmm mount | **Works** (size-only BIOS check) |
| Dreamful as gameplay fixture | **Rejected** (A/B/A) |
| MIT move-demo interactive proof | **PASS** — keep EXPERIMENTAL until offline cold-start + NES smoke regression |
| Catalog FDS | **Disabled** |
| Proprietary Nintendo BIOS | **Never** substitute / redistribute |

Next: offline cold-start for move-demo under Compose; NES/FCEUmm regression; then reconsider catalog enablement.
