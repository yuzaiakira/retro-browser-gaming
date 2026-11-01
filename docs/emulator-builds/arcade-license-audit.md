# Arcade license and runtime audit (PH-12.4)

Date: 2026-11-01  
Scope: Modern MAME WASM subset + FBNeo exclusion + legal engineering fixture selection.

## Verdict

| Item | Decision |
|------|----------|
| Modern MAME core (GPL-2.0-or-later) | **GO** for self-hosted browser WASM subset |
| FBNeo in unrestricted public app | **NO-GO** (non-commercial / no-profit / no-donation terms) |
| MAMEDev “free ROM” downloads (Gridlee, Robby Roto, Exidy set, …) | **NO-GO to redistribute** (site-only + typically non-commercial) |
| Selected engineering driver | **`rbgdot`** — first-party minimal MAME driver + MIT ROM ZIP |
| Formal driver GO/NO_GO | **GO** for `rbgdot` only (not “all arcade machines”) |
| Product catalog approval | **PENDING** |
| Commercial ROM auto-download / bundling | **FORBIDDEN** |

## 1. Modern MAME licensing

- Upstream: https://github.com/mamedev/mame  
- Project license (post MAME 0.172 / git `35ccf865…`): **GPL-2.0-or-later** for the project as a whole (`COPYING`, `docs/legal/GPL-2.0`).  
- Individual source files may carry BSD-3-Clause or other notices in headers; the linked WASM binary remains a GPL-covered work.  
- Obligations for redistribution: ship Corresponding Source (or a written offer), preserve notices, do not relicense downstream as proprietary.  
- **Compatible** with this repository’s self-hosted engineering cores when source-offer / lock metadata are maintained.

## 2. Component / dependency licenses (summary)

MAME’s `COPYING` / `docs/legal` aggregates third-party code (zlib, Asio, SoftFloat, etc.). For a **SUBTARGET** browser build we must:

1. Pin the exact MAME git revision.  
2. Record Emscripten SDK version.  
3. Retain full `docs/legal` + GPL texts with the distributed JS/WASM.  
4. List any RBG patches under GPL-compatible terms.  
5. Re-run a license inventory when the pin changes.

No silent stripping of GPL notices is permitted.

## 3. MAME trademark

Per https://www.mamedev.org/legal.html :

- **MAME®** is a registered trademark of Gregory Ember.  
- The name and logo **may not be used without permission** of the trademark holder.  
- Product UI must prefer neutral labels (**“Arcade (MAME-derived runtime)”**, core id `mame_rbg_arcade`) and must **not** imply endorsement or use the MAME logo asset.  
- Documentation may cite “MAME” factually when describing upstream provenance.

## 4. FBNeo (FinalBurn Neo) — separate audit

- Upstream license (`src/license.txt`): free use/modify/redistribute **with non-commercial / no-profit restrictions**, mandatory public source changes, verbatim license text, **no ROM bundling without rights**, **no donations** for projects using FBNeo source.  
- Also inherits historical Final Burn non-commercial language and MAME-derived non-commercial redistribution clauses in portions of the tree.  
- **Decision:** do **not** vendor, lock, or ship FBNeo into the unrestricted public application. EmulatorJS CDN presence of `fbneo` is **not** authorization. Prior status **BLOCKED_FIXTURE** / **BLOCKED_LEGAL** remains for FBNeo.

## 5. Free ROM downloads ≠ redistribution rights

MAMEDev FAQ (legal.html) and roms index:

> Almost all of the free ROMs on the MAME site are licensed only for non-commercial use, and only for distribution from the MAME site.

Site pages for Gridlee / Robby Roto / Exidy titles repeat: approved for free distribution **on that site only**; bundling with MAME or third-party software requires separate owner permission.

Prior PH-05 evidence (`PH-05/fbneo-blocker-20261022.md`) additionally recorded TLS / fetch failure for Gridlee. Even if fetch succeeded, **hosting those ZIPs in this repo or CDN would violate the stated redistribution terms**.

## 6–10. Fixture selection

| Candidate | Hardware / driver | Legal redistribution | Homebrew compile | BIOS / PROM / parent | Decision |
|-----------|-------------------|----------------------|------------------|----------------------|----------|
| Gridlee | `gridlee` | Site-only NC | N/A (original dump) | On-site ZIP | **NO-GO** |
| Robby Roto | Astrocade family | Site-only NC | N/A | On-site ZIP | **NO-GO** |
| Exidy set | Various Exidy | Site-only NC | N/A | On-site ZIP | **NO-GO** |
| Commercial CPS / Neo Geo / etc. | Various | No | N/A | Proprietary BIOS / parents | **NO-GO** |
| **`rbgdot` (first-party)** | Custom minimal driver in RBG MAME SUBTARGET | **MIT ROM + GPL driver source** | Yes — reproducible build script | **None** (no parent/BIOS/samples) | **GO** |

### Selected driver: `rbgdot`

- **Why:** Only path that satisfies “prefer entirely original, reproducibly built test fixture” without relying on MAMEDev site-only ROMs or commercial sets.  
- **Hardware model:** Minimal raster board (fixed resolution RGB framebuffer + coin/start/joystick/buttons). No third-party CPU microcode ROMs.  
- **ROM set:** Single ZIP member set defined by the driver `ROM_START`; hashes owned by RBG; version tied to core/driver pin.  
- **Homebrew:** Fixture graphics/logic authored under MIT; build instructions in `scripts/build-arcade-rbgdot-fixture.*`.  
- **BIOS / PROMs / samples / parents:** None required.  
- **Save states:** Verify empirically per driver (do not assume from API exposure).

### Formal GO / NO_GO

**GO** for engineering integration of:

1. GPL MAME WASM SUBTARGET containing **only** `rbgdot` (plus unavoidable MAME framework deps).  
2. MIT `rbgdot` ROM ZIP as a **private/engineering** fixture (product publication approval still pending).  
3. Isolated frame adapter + ROMset validation contract.

**NO-GO** for: FBNeo public bundling; any MAMEDev free-ROM mirror; claiming support for arbitrary arcade PCBs because one driver works; auto-approving commercial titles.

## Outstanding non-legal risks (tracked, not NO-GO)

- Modern MAME + Emscripten compile time / binary size.  
- Trademark-safe product naming.  
- Empirical save-state support for `rbgdot`.  
- Offline PWA size budget for WASM+JS.

Evidence directory: `.runtime/test-evidence/PH-12/arcade/`.
