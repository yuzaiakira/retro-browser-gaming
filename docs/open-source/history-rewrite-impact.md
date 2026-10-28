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

## Dry-run executed (2026-10-26)

Isolated disposable clone only. Owner working repository **not** rewritten. **No force-push.**

| Field | Value |
| --- | --- |
| Tool | `git-filter-repo` (venv) `--invert-paths --paths-from-file history-removal-manifest.txt` |
| Commits parsed | 79 |
| Tip before (owner HEAD) | `6b0608c42332f67dc1442fe99f7f32a19f24600b` |
| Tip after (dry-run only) | `36b187a3f1b17cefa023a29dcdc44cb2f2a6a5ef` |
| Binary paths remaining in history | **none** (`HISTORY_PATHS_CLEAN`) |
| Loader present at tip | yes (`ejs-4.2.3/loader.js`) |
| SOURCE_ONLY lock | PASS |
| Tracked-binary CI check | PASS |

Backup: `/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-20261026/`  
(SHA map also at `filter-sha-map.txt` in that backup directory.)

**Owner decision required** before applying this rewrite to the active repo or `origin`.

## Post-dry-run commits (must be included before apply)

The disposable dry-run tip (`36b187a`) was produced from owner tip `6b0608c`. Later local commits (backup CLI, docs, CI SOURCE_ONLY, Player messaging, etc.) **do not re-add** the 59 binary paths to the tip tree, but a **fresh** isolated `git-filter-repo` run from the approved publication tip is required before any remote rewrite so SHA mappings stay accurate.

Publication Options A/B: `docs/open-source/github-publication-plan.md`.


## Fresh dry-run (2026-10-28) — Option B1 candidate

Isolated disposable clone only. Owner working repository **not** rewritten. **No force-push.**

| Field | Value |
| --- | --- |
| Tool | `git-filter-repo` `--invert-paths --paths-from-file history-removal-manifest.txt` |
| Commits parsed | 125 |
| Tip before (private) | `97420c1994071a28e1870f7c23c67e3b40f1c6fd` |
| Tip after (candidate only) | `1dfb4955797ec47603f1dc6b35de1ce121a84278` |
| Binary paths remaining in history | **none** (`HISTORY_PATHS_CLEAN`) |
| SOURCE_ONLY lock | PASS |
| `check-public-source-safety.py --expect-history-clean` | PASS |
| Candidate dir | `/home/akira/Projects/git-contribute/retro-browser-gaming-public-candidate-20261028/` |
| Bundle | `retro-browser-gaming-os-backup-20261028/retro-browser-gaming-all-refs-after-setup.bundle` |

Prior 2026-10-26 candidates are **stale** relative to this tip.
