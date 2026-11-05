# PH-16 Git history remediation plan

**Status:** Isolated sanitized-history **candidate validated**; original `main` **not** rewritten.  
**Original `main` SHA:** `24b8c55ee7df3b2b78c7622eda294f85e373f589`  
**Candidate SHA:** `e88150235e4f4d3dbcb5ded860789da01eacfdc9`  
**Inventory:** `docs/release/git-history-removal-inventory.json`  
**Filter test report:** `docs/release/git-history-filter-test-report.md`

## Independent verdicts (2026-11-05)

| Gate | Verdict |
|---|---|
| **TIP_HYGIENE** | **PASS** (private tip unchanged; no tracked private `.wasm`/`.data`) |
| **HISTORY_SANITIZATION_CANDIDATE** | **PASS** (disposable filter experiment only) |
| **HISTORY_SANITIZED_TESTS** | **PASS** (unit/type/lint/history auditors on candidate; see filter-test report) |
| **GITHUB_SOURCE_PUSH_READY** | **NOT_CLEARED** |
| **PUBLIC_RELEASE_GO** | **STOP** |

A successful isolated test does **not** authorize replacing the original Git history or publishing.

## Restricted content summary

| Class | Scale | On private tip? | On `origin/main` history? |
|---|---|---|---|
| Private emulator `.wasm`/`.data` under `apps/web/public/cores/` | 59 paths; ~85 MiB blob payload | No | **Yes** (59 paths) |
| Historical `docs/test-evidence/` | ~1090 blobs; ~33.9 MiB | No (gitignored) | **Yes** |
| Git LFS | None found | — | — |
| Confirmed live secrets at tip | None | — | — |

Machine-readable blob IDs/sizes: `git-history-removal-inventory.json` (no blob **contents**).

## Backup verification (Phase 16.2)

| Item | Value |
|---|---|
| Location (outside any public push tree) | `/home/akira/Projects/git-contribute/retro-browser-gaming-ph16-backup-20261105T080855Z/` |
| Bundle | `retro-browser-gaming-all-refs.bundle` (~101 MiB) |
| SHA-256 | `220c812e498774d15252fbe9153d8ccbe07581c1e9459f03194121c2e2dae0a4` |
| `git bundle verify` | OK (10 refs; complete history) |
| Restore smoke clone HEAD | `24b8c55…` **PASS** |
| Classification | **RESTRICTED_PRIVATE_BACKUP** — do not publish |

Original refs and `backup/*` branches were **not** deleted.

## Remote exposure assessment (Phase 16.5)

GitHub repo `yuzaiakira/retro-browser-gaming` at assessment time:

- **Visibility:** `private` (not public).
- **Forks:** 0.
- **Tags:** none.
- **Branches on origin:** `main`, `feat/platform-expansion-phase-1` — **both** still reach the 59 restricted core paths historically.
- **Tip trees on GitHub `main`:** 0 tracked `cores/**/*.wasm|.data`; one related tip path `docs/test-evidence.md` (markdown, not the profile directory).
- **Local PR refs:** none.
- **Git LFS:** not in use.

### Why rewriting only local `main` is insufficient

1. `origin/main` and `origin/feat/platform-expansion-phase-1` already store the restricted historical blobs while the repo is private.
2. Making the **same** GitHub repository public (or pushing unsanitized local `main` atop it) would expose those objects without a history rewrite **or** a fresh public repository.
3. Merging `backup/*`, `backup/pre-strip-cursor-coauthor`, or pre-filter feature tips into a public branch would **reintroduce** tainted objects.

### Required GitHub remediation (human-approved; do not auto-execute)

**Preferred (Option B — matches prior open-source checklist):**

1. Keep the current GitHub repo **private** as the engineering/private-asset lineage (or archive it).
2. Create a **new** public repository.
3. Push **only** the sanitized candidate history (or a fresh root commit of the sanitized tip, per counsel/process).
4. Never push private backup bundles or `backup/*` refs to the public remote.
5. Re-run `check-public-source-safety.py --expect-history-clean` on the **exact** ref that will be published.

**Alternative (Option A — rewrite existing remotes):**

1. Owner + counsel approval for destructive history rewrite.
2. Coordinated force-push of every published ref that can reach restricted blobs (`main`, `feat/…`, any PR head forks).
3. Collaborator re-clone instructions; fork purge (currently 0 forks).
4. Review branch protection / allow-force-push temporarily then restore.
5. Accept that old SHAs remain recoverable from any unrevoked clones/caches until GC + time.

## Proposed final migration procedure (after human approval)

1. Confirm backup bundle SHA and restore smoke still PASS.
2. Freeze private `main` tip (or tag `private-pre-public-migration-<date>`).
3. Rebuild candidate from that tip with `scripts/build-sanitized-candidate.sh` (or PH-16 stamp process); diff tip trees must stay identical for retained paths.
4. Re-run Phase 16.4 auditors on the candidate.
5. Owner selects Option B (new public repo) or Option A (rewrite).
6. Publish **only** the approved sanitized refs; record published HEAD SHA in release docs.
7. Leave `GITHUB_SOURCE_PUSH_READY` uncleared until the **published** remote history is re-audited.
8. Leave `PUBLIC_RELEASE_GO=STOP` until its independent mandatory gates pass.

## Rollback procedure

1. Do **not** delete the PH-16 backup directory or `backup/*` refs.
2. If a mistaken rewrite of a disposable clone occurs: delete that clone; restore from bundle.
3. If a mistaken force-push occurs: restore refs from the verified bundle (`git fetch bundle '+refs/*:refs/*'` into a recovery clone), then force-push recovery **only** with explicit owner approval.
4. Original private worktree at `24b8c55…` remains authoritative until an approved migration.

## Human approval requirements

- Repository owner approval for any force-push or new public repository creation.
- Counsel/legal review before public visibility of third-party emulator binaries **or** before claiming public SOURCE clearance.
- Explicit decision: Option A vs Option B.
- Confirmation that collaborators have no uncleared forks/clones if Option A is chosen.
- Separate product/legal/physical approvals remain required for `PUBLIC_RELEASE_GO`.

## Remaining blockers for `GITHUB_SOURCE_PUSH_READY`

1. No approved publication target / Option A|B decision recorded.
2. Restricted blobs still present on current GitHub `origin/main` + `origin/feat` history (private repo).
3. Intended push history not yet the sanitized candidate (local `main` still contains restricted history).
4. Post-publish remote audit not yet possible.
5. Cursor co-author policy: candidate clean; ensure publication path does not reintroduce parallel backup history.

## Remaining blockers for `PUBLIC_RELEASE_GO`

Unchanged independent STOP causes (see `go-no-go.md` / `check-public-release-go.py`): reproducible private MAME wasm absence in SOURCE_ONLY layout, source delivery NOT_VERIFIED, legal PENDING, catalog product approvals empty, Android/iOS physical BLOCKED_EXTERNAL, etc.
