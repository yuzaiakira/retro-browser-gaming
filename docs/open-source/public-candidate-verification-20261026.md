# Public sanitized candidate verification (2026-10-26)

**Strategy:** Option B — isolated sanitized clone; original private repository untouched.  
**STOP:** No public remote created; no visibility change; no force-push.

## Locations (filesystem only)

| Artifact | Path |
| --- | --- |
| Candidate root | `/home/akira/Projects/git-contribute/retro-browser-gaming-public-candidate-20261026/` |
| Working tree | `…/tree/` |
| Source bundle used as input | `…/source-all-refs.bundle` |
| Paths removed | `…/paths-to-remove.txt` (59) |
| Commit map | `…/commit-map.txt` |

## SHA mapping (initial filter from owner tip `df9cb63`)

| Role | SHA |
| --- | --- |
| Original owner HEAD | `df9cb6397a217722a1f6cbded04206afc1f2b4e9` |
| Candidate rewritten HEAD | `9b8c3c1c2ec68655cfbde9169010a5781ad0fbae` |
| Commits parsed | 82 |
| Commit-map entries rewritten | 83 (all SHAs changed) |
| Branches in candidate | `main` only |
| Tags | none |

> If additional commits land on the private repo before publication, **re-run** filter-repo from the new tip and replace these SHAs. Do not publish the stale candidate.

## History / tip audits

| Check | Result |
| --- | --- |
| `apps/web/public/cores/**/*.data\|.wasm` reachable in candidate history | **none** (`HISTORY_PATHS_CLEAN`) |
| Tip tracked core binaries | **none** |
| Tip path set vs owner tip | **identical** (1242 paths) |
| Proprietary BIOS pathnames in history | **none found** |
| Secret heuristic (key/token patterns) on tip text | **0 hits** |
| EmulatorJS `loader.js` present | yes |

## Candidate software verification

| Check | Result |
| --- | --- |
| `verify-core-lock.py --mode SOURCE_ONLY` | PASS (314 / skip 59) |
| `check-no-private-cores-tracked.py` | PASS |
| `test_private_asset_backup.py` | PASS |
| Vitest | 21 PASS |
| `tsc --noEmit` | PASS |
| Next.js production build | PASS |
| Django tests (owner Compose; tip source identical) | 43 PASS |

## Owner repository preservation

| Check | Result |
| --- | --- |
| Owner HEAD after filter | still `df9cb63…` (unchanged by filter) |
| `origin` on owner | untouched |
| Private assets / backups | untouched |

## Publication (not executed)

See `legal-review-package.md` §8 and `github-publication-plan.md` Option B.
