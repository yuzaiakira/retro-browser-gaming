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

## Licensed fixture

| Asset | License | SHA-256 |
|-------|---------|---------|
| Dreamful / FDS-Diskmag `diskmag.fds` v1.0 | Noncommercial shareware (README terms) | `289e9e1eb5a8ad38284d66bf6429e930d3c2cab8e36513cb9fc0943b27dbb8b4` |

Stored as `.fixtures/fds-dreamful-diskmag.fds` (+ paired README). **Not** added to the public catalog.

## Browser evidence (2026-10-31)

Smoke: `apps/web/tests/fds-opendisksys-smoke.cjs` → `.runtime/test-evidence/PH-12/fds/`.

| Gate | Result |
|------|--------|
| OpenDiskSysROM 8192 B reproducible | PASS (`6ce74ea4…`) |
| BIOS mounted before content load | PASS (`/disksys.rom`) |
| Content load (no “BIOS missing”) | PASS |
| Non-black / non-Ozone framebuffer | PASS (solid magenta playfield after load; Ozone menu rejected by heuristic) |
| Input-driven frame change | PASS (`inputDelta≈133k`) |
| Save/load bytes | PASS (`saveBytes≈112 KiB`) |
| Offline-after-boot | PASS (smoke) |
| Clear diskmag UI / D-pad magazine navigation | **NOT claimed** — frames are flat color, not proven article UI |
| Catalog FDS | **Remain DISABLED** |
| VERIFIED_PLAYABLE | **No** |

## Decision

| Item | Status |
|------|--------|
| FreeDiskSysROM for real loads | **BLOCKED** |
| OpenDiskSysROM + FCEUmm mount | **Works** (size-only BIOS check) |
| Interactive Dreamful magazine UX | **Incomplete evidence** — keep EXPERIMENTAL / research |
| Catalog FDS | **Disabled** |
| Proprietary Nintendo BIOS | **Never** substitute / redistribute |

Next: obtain a minimal first-party/.MIT FDS homebrew with a moving sprite + D-pad proof, or extend Dreamful smoke until magazine screens are visually unambiguous; then reconsider catalog enablement.
