# Public source mirror verification

**Generated:** 2026-11-05T08:31:29Z
**PRIVATE HEAD:** `ff3fe256931351103e28ca064ff0cbbc418602d1`
**PUBLIC_SOURCE_MIRROR_READY:** **NOT_CLEARED**
**GITHUB_SOURCE_PUSH_READY:** NOT_CLEARED (destination unpublished)
**PUBLIC_RELEASE_GO:** STOP (independent)

## Checks

| Check | Status | Detail |
|---|---|---|
| MIRROR_STATE | PASS | /home/akira/Projects/git-contribute/retro-browser-gaming/.runtime/test-evidence/PH-17/public-source-mirror-state.json |
| CANDIDATE_FRESHNESS | PASS | private_sha=ff3fe256931351103e28ca064ff0cbbc418602d1 |
| HISTORY_CLEAN | PASS | history_clean=true |
| TIP_EQUIVALENCE | PASS | retained paths match |
| PUBLICATION_REFS | PASS | only refs/heads/main |
| NO_REMOTES | PASS | no remotes |
| SOURCE_ONLY_OK | PASS | ok |
| NO_PRIVATE_CORES_OK | PASS | ok |
| PUBLIC_SOURCE_SAFETY_OK | PASS | ok |
| LIVE_HISTORY_SCAN | PASS | no cores/evidence |
| FILE_POLICY_HARD | PASS | {"PRIVATE_ONLY": 0, "BLOCKED_LEGAL": 0, "BLOCKED_EXTERNAL": 0, "NEEDS_LEGAL_REVIEW": 562} |
| FILE_POLICY_LEGAL | NOT_CLEARED | NEEDS_LEGAL_REVIEW=562 |
| FILE_POLICY_FRESH | PASS | ff3fe256931351103e28ca064ff0cbbc418602d1 |
| ROOT_LICENSE | PASS | LICENSE present |
| COUNSEL | NOT_CLEARED | pack_entries=81 |
| REMOVAL_MANIFEST | PASS | present |

## Blockers

- unreviewed content remains: NEEDS_LEGAL_REVIEW=562
- counsel-decisions.json absent — licenses unresolved

## Candidate

- private_sha: `ff3fe256931351103e28ca064ff0cbbc418602d1`
- candidate_sha: `402e889613d8d0aec235b82313b36f4ceb593ecd`
- candidate_tree: `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17B/tree`
- backup_bundle: `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17B/private-main-ff3fe2569313.bundle`

## Classification buckets (NEEDS_LEGAL_REVIEW)

| Bucket | Approx count |
|---|---|
| Emulator frontend under `apps/web/public/cores/` | 335 |
| Legal fixtures (`.fixtures/` / `fixtures/`) | 206 |
| Corresponding-source patches | 20 |
| Other | includes LOCAL_ONLY build recipes (e.g. MAME wasm script) |

Hard blockers (PRIVATE_ONLY / BLOCKED_*) in tip: **0**.

## Git ref inventory (candidate)

- `refs/heads/main` only
- Remotes: none
- Tags: none

## Reproducibility

See `public-source-mirror-plan.md` and `.runtime/test-evidence/PH-17/public-source-mirror-state.json`.

## Independent gates (unchanged)

- `GITHUB_SOURCE_PUSH_READY=NOT_CLEARED`
- `PUBLIC_RELEASE_GO=STOP`

