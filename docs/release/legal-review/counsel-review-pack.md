# Counsel review pack (PH-18) — NEEDS_LEGAL_REVIEW tip files

**Generated:** 2026-11-05T08:46:28Z
**Git HEAD:** `ca93b52f8591605d572fa1893f667818a3ee4252`
**Policy tip SHA (classification):** `c2cff75e5c0d4f017800501a3fec2d59b59f704a`

## Executive counts

- Original NEEDS_LEGAL_REVIEW files: **562**
- Review groups: **30**
- Groups with provenance gaps: **14**
- Independent legal questions (sum across groups): **43**
- Entries with ≥1 provenance gap: **200**

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

### RG-001 — `emulatorjs-4.2.3` (69 files)

- SPDX: `GPL-3.0-or-later`
- Upstream revision: `e150dc0491ae747028919fb82d6598954976ede6`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: core report JSON — confirm whether generated and redistributable
- Questions:
  1. May EmulatorJS 4.2.3 tracked JS/CSS/localization be published in public SOURCE?
  1. Does public SOURCE of loaders without binaries satisfy GPL corresponding-source expectations when binaries are offered separately?
- Members: see `review-groups.json` → `RG-001.members`

### RG-002 — `emulatorjs-4.2.3` (2 files)

- SPDX: `GPL-3.0-or-later`
- Upstream revision: `e150dc0491ae747028919fb82d6598954976ede6`
- Review track: **restricted_redistribution**
- Modifications: NOT_CLEARED lineage metadata — see not-cleared-cores.md
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: core report JSON — confirm whether generated and redistributable
- Questions:
  1. Confirm BLOCKED_LEGAL / NOT_CLEARED status remains for public SOURCE mention of this lineage.
- Members: see `review-groups.json` → `RG-002.members`

### RG-003 — `fixture:cc0` (1 files)

- SPDX: `CC0-1.0`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-003.members`

### RG-004 — `fixture:dot` (2 files)

- SPDX: `MIT`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-004.members`

### RG-005 — `fixture:dreamcast` (1 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: partial provenance (README and/or LICENSES heuristic) — no exact licenses-and-assets.md row
- Questions:
  1. Confirm SPDX, upstream URL/revision, and redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-005.members`

### RG-006 — `fixture:fds` (4 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: partial provenance (README and/or LICENSES heuristic) — no exact licenses-and-assets.md row
- Questions:
  1. Confirm SPDX, upstream URL/revision, and redistribution for public SOURCE.
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
- Provenance gaps: partial provenance (README and/or LICENSES heuristic) — no exact licenses-and-assets.md row
- Questions:
  1. Confirm SPDX, upstream URL/revision, and redistribution for public SOURCE.
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

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: partial provenance (README and/or LICENSES heuristic) — no exact licenses-and-assets.md row
- Questions:
  1. Confirm SPDX, upstream URL/revision, and redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-011.members`

### RG-012 — `fixture:misc` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: source-tree LICENSE present but not linked from licenses-and-assets.md row for this exact path
- Questions:
  1. Owner attestation: originality vs upstream; confirm public SOURCE redistribution.
  1. Counsel: accept tree LICENSE as sufficient notice for these paths?
- Members: see `review-groups.json` → `RG-012.members`

### RG-013 — `fixture:misc` (5 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **missing_license_evidence**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: no exact row in docs/licenses-and-assets.md and no tree LICENSE/README hit
- Questions:
  1. Establish SPDX, upstream URL/revision, and redistribution permission.
- Members: see `review-groups.json` → `RG-013.members`

### RG-014 — `fixture:misc` (102 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: source-tree LICENSE present but not linked from licenses-and-assets.md row for this exact path
- Questions:
  1. Owner attestation: originality vs upstream; confirm public SOURCE redistribution.
  1. Counsel: accept tree LICENSE as sufficient notice for these paths?
- Members: see `review-groups.json` → `RG-014.members`

### RG-015 — `fixture:mit` (34 files)

- SPDX: `MIT`
- Upstream revision: `see source field (release/commit pin in licenses-and-assets.md)`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May this fixture be redistributed in a public GitHub SOURCE repository?
  1. Are attribution/NOTICE requirements satisfied as packaged?
- Members: see `review-groups.json` → `RG-015.members`

### RG-016 — `fixture:mit` (37 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: partial provenance (README and/or LICENSES heuristic) — no exact licenses-and-assets.md row
- Questions:
  1. Confirm SPDX, upstream URL/revision, and redistribution for public SOURCE.
- Members: see `review-groups.json` → `RG-016.members`

### RG-017 — `fixture:mit` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **missing_license_evidence**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: no exact row in docs/licenses-and-assets.md and no tree LICENSE/README hit
- Questions:
  1. Establish SPDX, upstream URL/revision, and redistribution permission.
- Members: see `review-groups.json` → `RG-017.members`

### RG-018 — `fixture:mit` (9 files)

- SPDX: `MIT`
- Upstream revision: `REV_UNKNOWN`
- Review track: **first_party_attestation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: source-tree LICENSE present but not linked from licenses-and-assets.md row for this exact path
- Questions:
  1. Owner attestation: originality vs upstream; confirm public SOURCE redistribution.
  1. Counsel: accept tree LICENSE as sufficient notice for these paths?
- Members: see `review-groups.json` → `RG-018.members`

### RG-019 — `hatari-2.6.1` (1 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `2.6.1`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May hatari.js glue be published publicly; confirm EmuTOS/firmware notices.
- Members: see `review-groups.json` → `RG-019.members`

### RG-020 — `js2me` (249 files)

- SPDX: `MIT`
- Upstream revision: `828b81b468953c34bb754b59e67c1021754e8bdb`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: crypto-related JS path — confirm no export-control / additional license issues
- Questions:
  1. Confirm vendored js2me tree at pinned commit may be published publicly under MIT.
  1. Review javax/crypto and other packages for additional notices.
- Members: see `review-groups.json` → `RG-020.members`

### RG-021 — `jsdos-8.3.8` (4 files)

- SPDX: `GPL-2.0-only`
- Upstream revision: `8.3.8`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. May jsdos 8.3.8 JS loaders be published in public SOURCE with GPL-2.0 obligations?
- Members: see `review-groups.json` → `RG-021.members`

### RG-022 — `mame-rbg-arcade` (2 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `see docs/emulator-builds/mame-wasm-arcade.md`
- Review track: **restricted_redistribution**
- Modifications: LOCAL_ONLY engineering build; not cleared for PUBLIC_BROWSER
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm rbg_arcade.js/html remain LOCAL_ONLY for product; may SOURCE publish glue/scripts?
  1. Do not clear PUBLIC_BROWSER distribution without separate counsel + product decision.
- Members: see `review-groups.json` → `RG-022.members`

### RG-023 — `mame-rbg-arcade-build` (1 files)

- SPDX: `GPL-2.0-or-later`
- Upstream revision: `see docs/emulator-builds/mame-wasm-arcade.md`
- Review track: **restricted_redistribution**
- Modifications: LOCAL_ONLY engineering build; not cleared for PUBLIC_BROWSER
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm rbg_arcade.js/html remain LOCAL_ONLY for product; may SOURCE publish glue/scripts?
  1. Do not clear PUBLIC_BROWSER distribution without separate counsel + product decision.
- Members: see `review-groups.json` → `RG-023.members`

### RG-024 — `patch-81_eo` (2 files)

- SPDX: `GPL-3.0-or-later`
- Upstream revision: `REV_UNKNOWN`
- Review track: **restricted_redistribution**
- Modifications: eo_loadp / CRT / joypad — NOT_CLEARED binary lineage
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Publishing patch text vs redistributing modified binary — confirm obligations.
- Members: see `review-groups.json` → `RG-024.members`

### RG-025 — `patch-atari800` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **counsel_decision_required**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm patch corresponding-source completeness for any public binary offer.
- Members: see `review-groups.json` → `RG-025.members`

### RG-026 — `patch-bluemsx` (7 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **counsel_decision_required**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm patch corresponding-source completeness for any public binary offer.
- Members: see `review-groups.json` → `RG-026.members`

### RG-027 — `patch-hatari` (5 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **counsel_decision_required**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm patch corresponding-source completeness for any public binary offer.
- Members: see `review-groups.json` → `RG-027.members`

### RG-028 — `patch-mame-rbgdot` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **restricted_redistribution**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Provenance gaps: patch license/upstream incomplete
- Questions:
  1. MAME rbgdot patches — LOCAL_ONLY product class; SOURCE publication of patches?
- Members: see `review-groups.json` → `RG-028.members`

### RG-029 — `patch-vecx` (2 files)

- SPDX: `SPDX_UNKNOWN`
- Upstream revision: `REV_UNKNOWN`
- Review track: **restricted_redistribution**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Vectrex BIOS remains BLOCKED_EXTERNAL — confirm patch publication is OK without BIOS.
- Members: see `review-groups.json` → `RG-029.members`

### RG-030 — `ruffle-0.7.1` (8 files)

- SPDX: `MIT OR Apache-2.0`
- Upstream revision: `89a7049965f3090e706265670df309a5128233ac`
- Review track: **third_party_license_interpretation**
- Modifications: none_documented
- Approval status: `NEEDS_LEGAL_REVIEW` (not auto-approved)
- Questions:
  1. Confirm selfhosted Ruffle 0.7.1 package may be mirrored publicly under MIT OR Apache-2.0.
- Members: see `review-groups.json` → `RG-030.members`

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
