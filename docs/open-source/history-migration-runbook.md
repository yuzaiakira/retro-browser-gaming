# History migration runbook (DO NOT EXECUTE REMOTELY WITHOUT OWNER APPROVAL)

## Preconditions

- [ ] Current migration commit merged/reviewed on `main`
- [ ] Verified backup of full Git repo (see impact report)
- [ ] Isolated disposable clone dry-run PASSED
- [ ] Collaborators notified; PRs/forks will break relative to rewritten SHAs
- [ ] **Explicit written owner approval** for force-updating remotes

## Dry-run (already prepared locally)

See `docs/open-source/history-rewrite-impact.md` for the disposable-clone procedure using `git-filter-repo` and `history-removal-manifest.txt`.

## Proposed remote update (NOT RUN)

After owner approval only:

1. Push cleaned history to a **new** temporary remote ref or replacement repo for review.
2. Compare tip trees and smoke tests.
3. Schedule maintenance window.
4. Update `origin/main` (and other approved refs) with a scoped force-push.
5. Rotate any credentials if history ever contained secrets (none expected for these binaries).
6. Ask collaborators to re-clone; do not rebase personal work onto rewritten history blindly.

## Limits of history rewrite

Old commits may remain in forks, PR refs, caches, mirrors, and prior clones. Rewriting does **not** guarantee global erasure.
