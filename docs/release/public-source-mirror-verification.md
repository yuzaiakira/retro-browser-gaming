# Public source mirror verification

**Generated:** 2026-11-05T08:31:04Z
**PRIVATE HEAD:** `3748fb9ee2795a6ac6d37b8bbab513c243de9b4c`
**PUBLIC_SOURCE_MIRROR_READY:** **NOT_CLEARED**
**GITHUB_SOURCE_PUSH_READY:** NOT_CLEARED (destination unpublished)
**PUBLIC_RELEASE_GO:** STOP (independent)

## Checks

| Check | Status | Detail |
|---|---|---|
| MIRROR_STATE | PASS | /home/akira/Projects/git-contribute/retro-browser-gaming/.runtime/test-evidence/PH-17/public-source-mirror-state.json |
| CANDIDATE_FRESHNESS | PASS | private_sha=3748fb9ee2795a6ac6d37b8bbab513c243de9b4c |
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
| FILE_POLICY_FRESH | PASS | 3748fb9ee2795a6ac6d37b8bbab513c243de9b4c |
| ROOT_LICENSE | PASS | LICENSE present |
| COUNSEL | NOT_CLEARED | pack_entries=81 |
| REMOVAL_MANIFEST | PASS | present |

## Blockers

- unreviewed content remains: NEEDS_LEGAL_REVIEW=562
- counsel-decisions.json absent — licenses unresolved

## Candidate

- private_sha: `3748fb9ee2795a6ac6d37b8bbab513c243de9b4c`
- candidate_sha: `8032be200fc056fdc012a592f33f871fefaa0b31`
- candidate_tree: `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17/tree`
- tip-scoped bundle sha256: `b3d6807a895365ac6a44c000da4b7db9d62be742f413eddbe3f6edb6e5283338`
- prior PH-16 backup verify: PASS (`220c812e…`)
- backup_bundle: `/home/akira/Projects/git-contribute/retro-browser-gaming-public-mirror-20261105TPH17/private-main-3748fb9ee279.bundle`

## Classification buckets (NEEDS_LEGAL_REVIEW)

| Bucket | Approx count |
|---|---|
| Emulator frontend under `apps/web/public/cores/` | 335 |
| Legal fixtures (`.fixtures/` / `fixtures/`) | 206 |
| Corresponding-source patches | 20 |
| Other | 1 (`scripts/build-mame-rbg-arcade-wasm.sh`) |

Hard blockers (PRIVATE_ONLY / BLOCKED_*) in tip: **0**.

## Git ref inventory (candidate)

- `refs/heads/main` only
- Remotes: none
- Tags: none
- Commit count: 223

## Reproducibility

```bash
RBG_MIRROR_PIN=3748fb9ee2795a6ac6d37b8bbab513c243de9b4c \
RBG_MIRROR_STAMP=20261105TPH17 \
./scripts/build-public-source-mirror.sh
python3 scripts/check-public-source-mirror-ready.py
```

Evidence: `.runtime/test-evidence/PH-17/`  
Policy: `docs/release/public-source-file-policy.json`  
Plan: `docs/release/public-source-mirror-plan.md`

## Independent gates (unchanged)

- `GITHUB_SOURCE_PUSH_READY=NOT_CLEARED` — no authorized destination / published refs
- `PUBLIC_RELEASE_GO=STOP` — product/delivery/physical gates incomplete
