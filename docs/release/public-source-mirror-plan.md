# Public-source mirror plan (Option B)

**Date:** 2026-11-05  
**Mode:** Local-only preparation — **no** remote creation, push, visibility change, or private-history rewrite.

## Verdicts

| Gate | Status |
|---|---|
| **PUBLIC_SOURCE_MIRROR_READY** | **NOT_CLEARED** |
| **GITHUB_SOURCE_PUSH_READY** | **NOT_CLEARED** |
| **PUBLIC_RELEASE_GO** | **STOP** (independent) |

Technical sanitization of an isolated candidate from the current private tip **PASS**. Legal counsel clearance and destination authorization remain open, so the mirror gate stays fail-closed.

## Pins

| Item | Value |
|---|---|
| Private `main` tip (pin) | `3748fb9ee2795a6ac6d37b8bbab513c243de9b4c` |
| Clean candidate SHA | `8032be200fc056fdc012a592f33f871fefaa0b31` |
| Candidate tree | `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17/tree` |
| Tip-scoped input bundle | `…/private-main-3748fb9ee279.bundle` |
| Bundle SHA-256 | `b3d6807a895365ac6a44c000da4b7db9d62be742f413eddbe3f6edb6e5283338` |
| Prior PH-16 backup (verified) | `…/retro-browser-gaming-ph16-backup-20261105T080855Z/` (`220c812e…`) |
| Commits ahead of `origin/main` | 82 (preserved; not pushed) |

## Repeatable pipeline

```bash
# From a clean private main tip:
./scripts/build-public-source-mirror.sh
python3 scripts/check-public-source-mirror-ready.py
# expect PUBLIC_SOURCE_MIRROR_READY=NOT_CLEARED until counsel + policy clear
```

Environment overrides: `RBG_MIRROR_PIN`, `RBG_MIRROR_STAMP`, `RBG_MIRROR_ROOT`, `RBG_PRIOR_BACKUP_DIR`.

### What the pipeline does

1. Pins private `HEAD` (or `RBG_MIRROR_PIN`).
2. Verifies the prior restricted PH-16 backup checksum (does not delete it).
3. Creates a **tip-scoped** bundle (ancestors of the pin only — **no** `backup/*` refs).
4. Clones into an isolated directory outside the private worktree.
5. Removes remotes; runs `git-filter-repo` with `docs/open-source/history-removal-manifest.txt`.
6. Strips Cursor `Co-authored-by` trailers **in the candidate only**.
7. Keeps publication refs = `refs/heads/main` only.
8. Runs SOURCE_ONLY lock, private-core tip check, public-source safety, history audit.
9. Classifies every tip file → `docs/release/public-source-file-policy.json`.
10. Writes `.runtime/test-evidence/PH-17/public-source-mirror-state.json`.

### What it never does

- Rewrite private `main` objects in place  
- Create GitHub repos / remotes / pushes  
- Change visibility of `yuzaiakira/retro-browser-gaming`  
- Delete backup refs or bundles  
- Clear counsel or product approvals  
- Ship LOCAL_ONLY WASM/DATA into the mirror history  

## History sanitization results

| Check | Result |
|---|---|
| Tip tree equivalence (1066 paths) | **PASS** |
| Restricted cores / `docs/test-evidence/` in history | **0** |
| `audit-public-history.py --expect-clean` | **PASS** |
| Cursor co-author trailers in candidate | **ABSENT** |
| Publication refs | `refs/heads/main` only |
| Remotes on candidate | none |

## File classification summary

See `public-source-file-policy.json` (full path inventory).

| Class | Count (tip `3748fb9`) |
|---|---|
| PUBLIC_SOURCE_ALLOWED | 504 |
| NEEDS_LEGAL_REVIEW | 562 |
| PRIVATE_ONLY | 0 |
| BLOCKED_LEGAL | 0 |
| BLOCKED_EXTERNAL | 0 |

**Important:** sanitized history ≠ legal publishability. Third-party emulator JS, fixtures, and patches remain `NEEDS_LEGAL_REVIEW` until counsel clears the legal-review pack.

## Source / license checks

| Check | Result |
|---|---|
| Root `LICENSE` (MIT) | Present |
| `legal-review-pack.json` | 81 entries, all `NEEDS_LEGAL_REVIEW` |
| `counsel-decisions.json` | **Absent** |
| SOURCE_ONLY core lock | PASS on candidate |
| Secret tip scan | PASS |

## Pending legal decisions

- Counsel must produce `docs/release/legal-review/counsel-decisions.json` clearing PUBLIC_CANDIDATE rows (or documenting exclusions).
- LOCAL_ONLY lineages (Flycast, MAME `rbg_arcade`) and NOT_CLEARED cores (`81_eo`, `virtualjaguar_js`) stay out of PUBLIC_BROWSER provisioning even after a source mirror exists.
- Product catalog approvals remain separate (`PUBLIC_RELEASE_GO`).

## Remaining blockers for `PUBLIC_SOURCE_MIRROR_READY=PASS`

1. `NEEDS_LEGAL_REVIEW` tip files (currently 562) cleared or removed per counsel.  
2. `counsel-decisions.json` present with explicit `CLEARED_FOR_PUBLIC` for intended rows.  
3. Rebuild mirror from the then-current private tip; freshness check must match.  
4. Human re-run of `check-public-source-mirror-ready.py` → PASS.

## Remaining blockers for `GITHUB_SOURCE_PUSH_READY`

1. `PUBLIC_SOURCE_MIRROR_READY=PASS`.  
2. Owner selects destination (new empty public repo — Option B).  
3. Exact published refs audited on the remote after an **authorized** push.  
4. Do not flip the existing private GitHub repo to public (historical restricted blobs remain there).

## Proposed publication procedure (authorized later)

Follow `docs/open-source/option-b-publication-steps.md` **after** mirror gate PASS and owner approval. Push **only** from the isolated candidate tree’s `main`.

## Rollback

- Discard the disposable mirror directory.  
- Private `main` and PH-16 / tip-scoped bundles remain authoritative.  
- Never force-push private origin as part of Option B.
