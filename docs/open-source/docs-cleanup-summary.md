# Documentation cleanup summary (2026-10-28)

Public-facing hygiene only. No remote publication. Private Git history was not rewritten.

## Size

| Scope | Before (tracked) | After (tracked) |
|---|---|---|
| `docs/` files | 966 | 94 |
| `docs/` bytes | ~25.77 MiB | ~0.58 MiB |
| Reduction | | **~97.8%** by bytes |

## Removed (from public tip tree)

| Class | Approx. count | Action |
|---|---|---|
| TEMPORARY_BROWSER_PROFILE | ~270 | Removed from tip; never archived (session risk) |
| GENERATED_TEST_OUTPUT | ~550+ under `docs/test-evidence/` | Private archive only |
| GENERATED open-source run logs | dozens of dated `.txt` | Private archive only |
| OBSOLETE_DUPLICATE | operational dumps | Removed from tip |

## Preserved (public)

| Class | Location |
|---|---|
| REQUIRED_PUBLIC_DOCUMENTATION | PDR, architecture, deployment, matrices, QA summary |
| REQUIRED_LICENSE_OR_CORRESPONDING_SOURCE | `LICENSES/`, open-source notices, CS matrix |
| REQUIRED_BUILD_PROVENANCE | `docs/emulator-builds/`, `scripts/patches/` |
| IMPORTANT_TEST_SOURCE | `apps/web/tests/*`, Django tests |
| OPTIONAL_SUMMARY | `docs/qa-summary.md`, acceptance matrix |

## GPL / corresponding source

PH-05 build notes live under `docs/emulator-builds/`.  
`assemble-corresponding-source-offer.py` and `corresponding-source-matrix.json` reference those paths.  
Assembly re-verified: `CORRESPONDING_SOURCE_OFFER_OK`.  
`81_eo` / `virtualjaguar_js` remain **NOT_CLEARED**.

## Test artifact destinations

Default: `.runtime/test-evidence/<suite>/` via `apps/web/tests/evidence-dir.js`.  
Override: `RBG_TEST_EVIDENCE_DIR` or `EVIDENCE_DIR`.  
CI guard: `scripts/check-docs-hygiene.py` (`DOCS_HYGIENE_PASS`).  
`.gitignore` / `.dockerignore` ignore `docs/test-evidence/` and `.runtime/test-evidence/`.

## Broken references

Tracked tree no longer links application code to deleted evidence paths.  
Policy pointer: `docs/test-evidence.md`. Summary QA: `docs/qa-summary.md`.

## Identity

| Item | Value |
|---|---|
| Private original HEAD | Record with `git rev-parse HEAD` on the private clone (not rewritten) |
| Sanitized candidate HEAD | Option B1 builder output `CANDIDATE_HEAD.txt` (disposable candidate, not published) |
| Candidate tree | disposable Option B1 candidate worktree (local only) |
| Public history cleanliness | **PASS** — 60/60 manifest paths absent; no Chromium profiles; no core binaries |
| Vitest | 66 passed |
| Genesis smoke | `GENESIS_GAMEPLAY_PASS` |
| Corresponding-source assemble | `CORRESPONDING_SOURCE_OFFER_OK` (gaps remain NOT_CLEARED) |
| Docs hygiene | `DOCS_HYGIENE_PASS` |
| Source-offer gate | `SOURCE_OFFER_GATE_OK` / delivery not verified |

## Remaining blockers

Root MIT LICENSE is **enacted** (see `FINAL-PUBLICATION-CHECKLIST.md`). Physical gamepad / iOS / staging HTTPS and live corresponding-source delivery remain open for hosted release. Publication of the sanitized candidate still requires owner authorization. **STOP** before publish.
