# Public source mirror verification

**Generated:** 2026-11-05T08:32:06Z
**PRIVATE HEAD:** `7a4aa14bdbeffaea4f031a650cdf0c2fc2ba52e2`
**PUBLIC_SOURCE_MIRROR_READY:** **NOT_CLEARED**
**GITHUB_SOURCE_PUSH_READY:** NOT_CLEARED (destination unpublished)
**PUBLIC_RELEASE_GO:** STOP (independent)

## Checks

| Check | Status | Detail |
|---|---|---|
| MIRROR_STATE | PASS | /home/akira/Projects/git-contribute/retro-browser-gaming/.runtime/test-evidence/PH-17/public-source-mirror-state.json |
| CANDIDATE_FRESHNESS | FAIL | candidate not built from expected private tip |
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

- stale candidate: state.private_sha=ff3fe256931351103e28ca064ff0cbbc418602d1 expected=7a4aa14bdbeffaea4f031a650cdf0c2fc2ba52e2
- unreviewed content remains: NEEDS_LEGAL_REVIEW=562
- counsel-decisions.json absent — licenses unresolved

## Candidate

- private_sha: `ff3fe256931351103e28ca064ff0cbbc418602d1`
- candidate_sha: `402e889613d8d0aec235b82313b36f4ceb593ecd`
- candidate_tree: `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17B/tree`
- backup_bundle: `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17B/private-main-ff3fe2569313.bundle`
