# Public sanitized candidate verification (2026-10-26)

**Strategy:** Option B — isolated sanitized clone; original private repository untouched.  
**Status tag:** `PUBLIC_REPOSITORY_READY_FOR_OWNER_APPROVAL`  
**STOP:** No public remote created; no visibility change; no force-push.

Machine-readable summary: `docs/open-source/public-candidate-summary-20261026.json`

## Locations

| Artifact | Path |
| --- | --- |
| Candidate root | `/home/akira/Projects/git-contribute/retro-browser-gaming-public-candidate-20261026/` |
| Working tree | `…/tree/` |
| Commit map | `…/commit-map.txt` |
| Paths removed | `…/paths-to-remove.txt` (59) |

## SHA mapping (current)

| Role | SHA |
| --- | --- |
| Private HEAD filtered | `60c8327f6916ec94c47bf739f449a7fe05538e50` |
| Candidate rewritten HEAD | `b306ebe7e24a494a884dcb31134c085343422302` |
| Tip map | `60c8327…` → `b306ebe…` |
| Commits parsed | 86 |
| Branches | `main` |
| Tags | none |

Supersedes earlier candidate tips `9b8c3c1` / `914f826`. **Re-filter again after enacting root LICENSE** before any public push.

## Audits

| Check | Result |
| --- | --- |
| Historical core `.data`/`.wasm` paths | **0** (`HISTORY_PATHS_CLEAN`) |
| Tip vs private tracked paths | **match** (1256) |
| Secret heuristic | **0** hits |
| SOURCE_ONLY / track check / backup unit tests | PASS |
| Vitest / tsc / Next build | PASS |
| License proposals + CS matrix + owner checklist present | yes |
| Owner `origin` | untouched |

## Owner gate

Checklist: `docs/open-source/owner-approval-checklist.md`  
Push steps (not executed): `docs/open-source/option-b-publication-steps.md`
