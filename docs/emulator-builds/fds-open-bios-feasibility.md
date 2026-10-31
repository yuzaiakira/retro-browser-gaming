# Famicom Disk System — open BIOS feasibility (PH-12.2 bounded)

Date: 2026-10-31. Goal: determine whether an open FDS BIOS can lawfully replace Nintendo’s `disksys.rom` for **interactive** FDS titles under pinned FCEUmm WASM — without redistributing proprietary firmware.

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

LGPL-3.0 text retained at `LICENSES/OpenDiskSysROM-LGPL-3.0.txt` for redistribution obligations if/when a BIOS binary is shipped.

## Completeness audit

### FreeDiskSysROM

Upstream README and `apireport.py` show **disk I/O entry points present as stubs / incomplete** relative to a working FDS BIOS. Project has not advanced since ~2020. **Not sufficient** to load real FDS software that calls `LoadFiles` / block transfer routines.

### OpenDiskSysROM

README claims **every documented entry point implemented**, including `LoadFiles`, block xfer, WriteFile, boot loader (“INSERT A DISK” / error retry). Upstream states MAME `fds` boots commercial SMB titles with this BIOS (commercial titles are **not** used as fixtures here). No Mario/Luigi animation (Nintendo IP avoided).

**Conclusion:** OpenDiskSysROM is the only candidate with a credible path to real disk loads. FreeDiskSysROM alone is **BLOCKED** for interactive FDS.

## Licensed interactive fixture probe

| Asset | License | SHA-256 | Notes |
|-------|---------|---------|-------|
| Dreamful / FDS-Diskmag `diskmag.fds` (v1.0) | Noncommercial shareware (redistributable at no cost with README intact) | `289e9e1eb5a8ad38284d66bf6429e930d3c2cab8e36513cb9fc0943b27dbb8b4` | https://github.com/TakuikaNinja/FDS-diskmag/releases/tag/v1.0 |

Dreamful is suitable as a **candidate** interactive FDS homebrew under its README terms. It was **not** integrated into the public catalog in this pass.

## FCEUmm WASM compatibility (this environment)

- Pinned EmulatorJS `fceumm` remains cartridge-NES oriented in catalog; FDS requires BIOS path + `.fds` media wiring and user-BIOS slot (`user-bios.ts` id `fds`, **disabled** / not gating).
- **No** browser FCEUmm + OpenDiskSysROM + Dreamful gameplay run was completed in this session (bounded feasibility only).
- Remaining work before any FDS VERIFIED claim: mount OpenDiskSysROM as user- or bundled-LGPL BIOS with CS offer, prove Dreamful (or other approved homebrew) interactive frames under FCEUmm, offline/install/save gates, and keep Nintendo BIOS out of the tree.

## Decision

| Item | Status |
|------|--------|
| FreeDiskSysROM for real loads | **BLOCKED** (incomplete disk APIs) |
| OpenDiskSysROM feasibility | **PROMISING** — API-complete per upstream; build reproducible; LGPL-3.0 OK if source offered |
| Catalog FDS | **Remain disabled** (existing reserved slot) |
| Proprietary Nintendo BIOS | **Never** substitute / redistribute |
| This phase FDS VERIFIED_PLAYABLE | **No** |

Next concrete task (when scheduled): wire OpenDiskSysROM through the Coleco-style user-BIOS pipeline or LGPL-cleared private provision, seed Dreamful under README terms, and run FCEUmm Chromium smoke with real input evidence.
