# Public sanitized candidate verification (2026-10-26)

**Strategy:** Option B — isolated sanitized clone; original private repository untouched.  
**STOP:** No public remote created; no visibility change; no force-push.

## Locations (filesystem only)

| Artifact | Path |
| --- | --- |
| Candidate root | `/home/akira/Projects/git-contribute/retro-browser-gaming-public-candidate-20261026/` |
| Working tree (current) | `…/tree/` |
| Prior filter snapshot | `…/tree-from-df9cb63.bak/` (superseded; keep offline) |
| Source bundle used as input | `…/source-all-refs.bundle` |
| Paths removed | `…/paths-to-remove.txt` (59) |
| Commit map | `…/commit-map.txt` |

## SHA mapping (refreshed from owner tip `01d6449`)

| Role | SHA |
| --- | --- |
| Original owner HEAD | `01d644998cd975f9dd2cef1eae446fe6af2c2336` |
| Candidate rewritten HEAD | `914f826f72f3e81e69f4117811324db20f5daa36` |
| Tip map | `01d6449…` → `914f826…` |
| Commits in candidate | 83 |
| Branches in candidate | `main` only |
| Tags | none |

Earlier dry filter from `df9cb63` → `9b8c3c1` is superseded; **publish only from a candidate rebuilt at the approved tip.**

## History / tip audits (current candidate)

| Check | Result |
| --- | --- |
| Core `.data`/`.wasm` paths in candidate history | **none** (`HISTORY_PATHS_CLEAN`) |
| Tip path set vs owner tip | **identical** (1248 paths) |
| Alpha UX present in candidate tip | yes (`Public Alpha limits`) |
| SOURCE_ONLY lock | PASS |
| Private-core track check | PASS |

## Owner repository preservation

| Check | Result |
| --- | --- |
| Owner HEAD after filter | `01d6449…` (unchanged by filter) |
| `origin` on owner | untouched / not force-pushed |
| Private assets / backups | untouched |

## Publication (not executed)

See `legal-review-package.md` §8 and `option-b-publication-steps.md`.

**Owner approval gate:** authorize creating a **new** public GitHub repo and pushing candidate `914f826…` (or a newer refreshed tip) — never flip visibility on `yuzaiakira/retro-browser-gaming`.
