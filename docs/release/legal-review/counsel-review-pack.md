# Counsel review pack (PH-18) — NEEDS_LEGAL_REVIEW tip files

**Generated:** 2026-11-05T09:11:40Z
**Git HEAD:** `0e920f2ac9d4a6dc13a9e0777b3060fd2748610d`
**Policy tip SHA (classification):** `c2cff75e5c0d4f017800501a3fec2d59b59f704a`

## Executive counts

- Original NEEDS_LEGAL_REVIEW files: **562**
- Review groups: **52**
- Groups with provenance gaps: **2**
- Independent legal questions (sum across groups): **65**
- Entries with ≥1 provenance gap: **3**

## Gate posture (unchanged by this pack)

- `PUBLIC_SOURCE_MIRROR_READY` = **NOT_CLEARED** until real counsel decisions exist
- `GITHUB_SOURCE_PUSH_READY` = **NOT_CLEARED**
- `PUBLIC_RELEASE_GO` = **STOP**

Do **not** treat this pack as approval. Do **not** copy `counsel-decisions.json.example` as live decisions.

## Preserved restrictions (do not silently change)

| Class | Examples |
|---|---|
| LOCAL_ONLY | Flycast wasm packs; MAME `rbg_arcade.*` |
| BLOCKED_LEGAL / NOT_CLEARED | `81_eo*`, `virtualjaguar_js*` |
| BLOCKED_EXTERNAL | ColecoVision BIOS; Vectrex `system.img` |

## Review groups

### RG-001 — `emulatorjs-4.2.3` (71 files)

- SPDX: `GPL-3.0-or-later`
- Upstream revision: `e150dc0491ae747028919fb82d6598954976ede6`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May EmulatorJS 4.2.3 tracked JS/CSS/localization be published in public SOURCE?
  1. Does public SOURCE of loaders without binaries satisfy GPL corresponding-source expectations when binaries are offered separately?
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-001.members`

### RG-002 — `fixture:cc0` (1 files)

- SPDX: `CC0-1.0`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-002.members`

### RG-003 — `fixture:dot` (2 files)

- SPDX: `MIT`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-003.members`

### RG-004 — `fixture:dreamcast` (1 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-004.members`

### RG-005 — `fixture:fds` (2 files)

- SPDX: `LicenseRef-Noncommercial-Shareware`
- Upstream revision: `see upstream README; author TakuikaNinja`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: legal_uncertainty_remains_after_technical_linkage
- Questions:
  1. Counsel: confirm redistribution terms from README/license evidence.
- Members: see `review-groups.json` → `RG-005.members`

### RG-006 — `fixture:fds` (2 files)

- SPDX: `MIT`
- Upstream revision: `generated fixture; SHA in fds-open-bios-feasibility.md`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-006.members`

### RG-007 — `fixture:gpl` (1 files)

- SPDX: `GPL-2.0-only`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-007.members`

### RG-008 — `fixture:gpl` (1 files)

- SPDX: `GPL-3.0-only`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-008.members`

### RG-009 — `fixture:gpl` (3 files)

- SPDX: `GPL-3.0-only`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-009.members`

### RG-010 — `fixture:huc` (1 files)

- SPDX: `GPL-2.0-only`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-010.members`

### RG-011 — `fixture:misc` (1 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-011.members`

### RG-012 — `fixture:misc` (2 files)

- SPDX: `CC0-1.0`
- Upstream revision: `bin/main.c.rom as packaged`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-012.members`

### RG-013 — `fixture:misc` (2 files)

- SPDX: `GPL-2.0-only`
- Upstream revision: `6.502.20050619 (see licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-013.members`

### RG-014 — `fixture:misc` (6 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/amiga-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-014.members`

### RG-015 — `fixture:misc` (3 files)

- SPDX: `MIT`
- Upstream revision: `release artifact mirrored as .fixtures/mit-dos-floppybird.zip`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-015.members`

### RG-016 — `fixture:misc` (5 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree; builds via scripts/build-dreamcast-dot-fixture.sh`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-016.members`

### RG-017 — `fixture:misc` (3 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/flash-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-017.members`

### RG-018 — `fixture:misc` (3 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/gb-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-018.members`

### RG-019 — `fixture:misc` (16 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/j2me-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-019.members`

### RG-020 — `fixture:misc` (21 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/j2me-notes/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-020.members`

### RG-021 — `fixture:misc` (19 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/j2me-paddle/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-021.members`

### RG-022 — `fixture:misc` (2 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/lynx-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-022.members`

### RG-023 — `fixture:misc` (3 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/msx-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-023.members`

### RG-024 — `fixture:misc` (1 files)

- SPDX: `MIT`
- Upstream revision: `release build-202008190836`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-024.members`

### RG-025 — `fixture:misc` (2 files)

- SPDX: `GPL-2.0-only`
- Upstream revision: `examples/scroll (HuC)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-025.members`

### RG-026 — `fixture:misc` (9 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/ps1-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-026.members`

### RG-027 — `fixture:misc` (5 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/psp-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-027.members`

### RG-028 — `fixture:misc` (2 files)

- SPDX: `MIT`
- Upstream revision: `v1.0 demo`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-028.members`

### RG-029 — `fixture:misc` (1 files)

- SPDX: `GPL-3.0-or-later`
- Upstream revision: `see scripts/patches/81_eo/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-029.members`

### RG-030 — `fixture:misc` (4 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/zx81-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-030.members`

### RG-031 — `fixture:mit` (33 files)

- SPDX: `MIT`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-031.members`

### RG-032 — `fixture:mit` (18 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-032.members`

### RG-033 — `fixture:mit` (2 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: legal_uncertainty_remains_after_technical_linkage
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
  1. Counsel: confirm redistribution terms from README/license evidence.
- Members: see `review-groups.json` → `RG-033.members`

### RG-034 — `fixture:mit` (19 files)

- SPDX: `MIT`
- Upstream revision: `generated via scripts/build-dreamcast-*.sh`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-034.members`

### RG-035 — `fixture:mit` (1 files)

- SPDX: `MIT`
- Upstream revision: `jag2048.jag as inventoried in licenses-and-assets.md`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-035.members`

### RG-036 — `fixture:mit` (1 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/flash-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-036.members`

### RG-037 — `fixture:mit` (1 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/msx-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-037.members`

### RG-038 — `fixture:mit` (1 files)

- SPDX: `MIT`
- Upstream revision: `release build-202008190836`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
- Members: see `review-groups.json` → `RG-038.members`

### RG-039 — `fixture:mit` (6 files)

- SPDX: `MIT`
- Upstream revision: `tracked tree under fixtures/zx81-dot/`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Owner attestation: confirm originality/redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-039.members`

### RG-040 — `hatari-2.6.1` (1 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `2.6.1`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May hatari.js glue be published publicly; confirm EmuTOS/firmware notices.
- Members: see `review-groups.json` → `RG-040.members`

### RG-041 — `js2me` (246 files)

- SPDX: `MIT`
- Upstream revision: `828b81b468953c34bb754b59e67c1021754e8bdb`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm vendored js2me tree at pinned commit may be published publicly under MIT.
  1. Review javax/crypto and other packages for additional notices.
- Members: see `review-groups.json` → `RG-041.members`

### RG-042 — `js2me` (3 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May these inventoried paths be published in public SOURCE with recorded notices?
  1. Confirm no additional export-control or notice obligations for javax.crypto stubs in this MIT tree
- Members: see `review-groups.json` → `RG-042.members`

### RG-043 — `jsdos-8.3.8` (4 files)

- SPDX: `GPL-2.0-only`
- Upstream revision: `8.3.8`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May jsdos 8.3.8 JS loaders be published in public SOURCE with GPL-2.0 obligations?
- Members: see `review-groups.json` → `RG-043.members`

### RG-044 — `mame-rbg-arcade` (2 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `see docs/emulator-builds/mame-wasm-arcade.md`
- Review track: **restricted_redistribution**
- Modifications: LOCAL_ONLY engineering build; not cleared for PUBLIC_BROWSER
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm rbg_arcade.js/html remain LOCAL_ONLY for product; may SOURCE publish glue/scripts?
  1. Do not clear PUBLIC_BROWSER distribution without separate counsel + product decision.
- Members: see `review-groups.json` → `RG-044.members`

### RG-045 — `mame-rbg-arcade-build` (1 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `see docs/emulator-builds/mame-wasm-arcade.md`
- Review track: **restricted_redistribution**
- Modifications: LOCAL_ONLY engineering build; not cleared for PUBLIC_BROWSER
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm rbg_arcade.js/html remain LOCAL_ONLY for product; may SOURCE publish glue/scripts?
  1. Do not clear PUBLIC_BROWSER distribution without separate counsel + product decision.
- Members: see `review-groups.json` → `RG-045.members`

### RG-046 — `patch-81_eo` (2 files)

- SPDX: `GPL-3.0-or-later`
- Upstream revision: `REV_UNKNOWN`
- Review track: **restricted_redistribution**
- Modifications: eo_loadp / CRT / joypad — NOT_CLEARED binary lineage
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Publishing patch text vs redistributing modified binary — confirm obligations.
- Members: see `review-groups.json` → `RG-046.members`

### RG-047 — `patch-atari800` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **counsel_decision_required**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm patch corresponding-source completeness for any public binary offer.
- Members: see `review-groups.json` → `RG-047.members`

### RG-048 — `patch-bluemsx` (7 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **counsel_decision_required**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm patch corresponding-source completeness for any public binary offer.
- Members: see `review-groups.json` → `RG-048.members`

### RG-049 — `patch-hatari` (5 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **counsel_decision_required**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm patch corresponding-source completeness for any public binary offer.
- Members: see `review-groups.json` → `RG-049.members`

### RG-050 — `patch-mame-rbgdot` (2 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `REV_UNKNOWN`
- Review track: **restricted_redistribution**
- Modifications: LOCAL_ONLY
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Counsel: confirm restricted class remains; SOURCE publication of these paths?
- Members: see `review-groups.json` → `RG-050.members`

### RG-051 — `patch-vecx` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **restricted_redistribution**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Vectrex BIOS remains BLOCKED_EXTERNAL — confirm patch publication is OK without BIOS.
- Members: see `review-groups.json` → `RG-051.members`

### RG-052 — `ruffle-0.7.1` (8 files)

- SPDX: `MIT OR Apache-2.0`
- Upstream revision: `89a7049965f3090e706265670df309a5128233ac`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm selfhosted Ruffle 0.7.1 package may be mirrored publicly under MIT OR Apache-2.0.
- Members: see `review-groups.json` → `RG-052.members`

## Exact counsel actions

1. Review each `RG-*` group (and underlying paths in `file-provenance.json`).
2. For each `artifact_id` in `legal-review-pack.json` that maps to published binaries, decide `CLEARED_FOR_PUBLIC` or `WITHHOLD`.
3. Write decisions only into a real `counsel-decisions.json` (never forge).
4. Owner completes attestation queue for first-party / patch originality claims.
5. Re-run `python3 scripts/check-public-source-mirror-ready.py` — expect NOT_CLEARED until decisions land.

## Remaining blockers

1. Missing live `counsel-decisions.json`.
2. All 562 tip NLR files still `NEEDS_LEGAL_REVIEW`.
3. LOCAL_ONLY / BLOCKED_* product restrictions unchanged.
4. Public destination for Option B mirror not authorized.

## Related machine-readable files

- `file-provenance.json`
- `review-groups.json`
- `owner-attestation-queue.md`
- `legal-review-pack.json` (binary-centric CS pack; still 0 counsel approvals)
