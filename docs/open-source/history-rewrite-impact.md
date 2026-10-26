# History rewrite impact (dry-run)

**Status:** Prepared for isolated dry-run. **Active repository not rewritten. No force-push.**

## Removal set

- File: `docs/open-source/history-removal-manifest.txt`
- Count: **59** paths under `apps/web/public/cores/**/*.data|*.wasm`
- Justification: private repository policy for emulator binary payloads (see asset audit)
- **Excluded:** fixtures, LICENSES, EmulatorJS JS/src, js2me, reports JSON

## Expected effects

| Item | Expectation |
| --- | --- |
| Commit SHAs | All commits that touched these blobs get new hashes |
| Authorship / messages | Preserved by git-filter-repo defaults |
| Signed commits/tags | Signatures invalidated if any exist on rewritten commits |
| Tip tree | Matches post-migration tree (binaries absent from Git, present in private store) |
| Open PRs / forks | Will not fast-forward; require re-clone or careful rebase |

## Dry-run procedure (isolated clone only)

```bash
# From a SAFE backup location — not the owner's primary worktree
BACKUP=/path/to/retro-browser-gaming.git-bundle-or-mirror
WORKDIR=/tmp/rbg-filter-dryrun-$$
git clone --mirror "$BACKUP" "$WORKDIR/mirror.git"
git clone "$WORKDIR/mirror.git" "$WORKDIR/tree"
cd "$WORKDIR/tree"
python3 -m pip install --user git-filter-repo
git filter-repo --invert-paths --paths-from-file \
  /path/to/repo/docs/open-source/history-removal-manifest.txt
# Verify no path remains:
git rev-list --objects --all | grep -E '\\.(data|wasm)$' | grep 'apps/web/public/cores' || echo CLEAN
# Tip must still build SOURCE_ONLY
```

Record old→new tip SHA mapping in this file after the dry-run executes.

## STOP

Do **not** replace the owner's working repository history or update `origin` until the owner authorizes Phase J.
