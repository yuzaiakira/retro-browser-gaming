# Documentation cleanup summary (2026-10-28)

Public-facing hygiene only. No remote publication. Private Git history was not rewritten.

## Size

| Scope | Before (tracked) | After (tracked) |
|---|---|---|
| `docs/` files | 966 | 94 |
| `docs/` bytes | ~25.77 MiB | ~0.57 MiB |
| Reduction | | **~97.8%** by bytes |

## Removed (from public tip tree)

| Class | Examples | Action |
|---|---|---|
| TEMPORARY_BROWSER_PROFILE | `docs/test-evidence/**/.offline-profile*` (~270 files) | Removed from tip; excluded from private archive |
| GENERATED_TEST_OUTPUT | Screenshots, Playwright JSON/txt under `docs/test-evidence/` | Archived privately, untracked |
| GENERATED_TEST_OUTPUT | `docs/open-source/*-20261026.txt` / `*-20261028.txt` run logs | Archived privately, untracked |
| OBSOLETE_DUPLICATE | Operational one-off audit dumps | Removed from tip |

## Preserved (public)

| Class | Location |
|---|---|
| REQUIRED_PUBLIC_DOCUMENTATION | PDR, architecture, deployment, matrices, QA summary |
| REQUIRED_LICENSE_OR_CORRESPONDING_SOURCE | `LICENSES/`, open-source notices, CS matrix |
| REQUIRED_BUILD_PROVENANCE | `docs/emulator-builds/*`, `scripts/patches/` |
| IMPORTANT_TEST_SOURCE | `apps/web/tests/*`, Django tests |
| OPTIONAL_SUMMARY | `docs/qa-summary.md`, acceptance matrix |

## GPL / corresponding source

PH-05 build notes migrated to `docs/emulator-builds/`.  
`assemble-corresponding-source-offer.py` and `corresponding-source-matrix.json` updated.  
Assembly re-verified: `CORRESPONDING_SOURCE_OFFER_OK`.  
`81_eo` / `virtualjaguar_js` remain **NOT_CLEARED**.

## Test artifact destinations

Default: `.runtime/test-evidence/<suite>/` via `apps/web/tests/evidence-dir.js`.  
Override: `RBG_TEST_EVIDENCE_DIR` or `EVIDENCE_DIR`.  
CI guard: `scripts/check-docs-hygiene.py`.

## History

Sanitized public candidate must include `docs/test-evidence/` in the history-removal manifest (extended). Original private repository is not rewritten.

## Remaining blockers

Root LICENSE still **BLOCKED_HUMAN**. Physical gamepad / iOS / staging HTTPS unchanged. Publication still requires owner authorization.


## Identity (post-cleanup)

| Item | Value |
|---|---|
| Private original HEAD | `6c5ec32ffc444066f0268a97c09affac4cdd8200` |
| Sanitized candidate HEAD | `8367724ab7f20caef2a0f0a223e8df54a7721187` |
| Candidate path | `retro-browser-gaming-public-candidate-20261028-docs-clean/tree` |
| Public history cleanliness | PASS — no `docs/test-evidence/` directory objects; no Chromium offline profiles |
| Vitest | 66 passed |
| Corresponding-source assemble | PASS |
