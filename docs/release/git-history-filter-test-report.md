# PH-16 git-history filter test report (isolated candidate)

**Date:** 2026-11-05  
**Phase:** 16.3–16.4  
**Original private `main` SHA (unchanged):** `24b8c55ee7df3b2b78c7622eda294f85e373f589`  
**Filtered candidate `main` SHA:** `e88150235e4f4d3dbcb5ded860789da01eacfdc9`  
**Disposable clone:** `/home/akira/Projects/git-contribute/retro-browser-gaming-ph16-candidate-20261105T080855Z/tree`  
**Commit map:** `/home/akira/Projects/git-contribute/retro-browser-gaming-ph16-candidate-20261105T080855Z/commit-map.txt` (230 lines incl. header)

## Safety constraints observed

- `git-filter-repo` ran **only** inside the disposable clone created from a local `--all` bundle.
- Original repository HEAD remained `24b8c55…` after the experiment (`PRIVATE_UNCHANGED_PASS`).
- Candidate remotes pointing at the bundle were removed before filtering; no writable GitHub remote on the candidate.
- No push, force-push, merge into original `main`, or deletion of backup refs.

## Filter specification

- Tool: `git-filter-repo` (venv under candidate stamp dir).
- Mode: `--invert-paths --paths-from-file docs/open-source/history-removal-manifest.txt --force`.
- Manifest contents (narrow): exact EmulatorJS/js-dos `.wasm`/`.data` paths under `apps/web/public/cores/ejs-4.2.3/` and `jsdos-8.3.8/`, plus directory prefix `docs/test-evidence/`.
- **Not** removed: EmulatorJS/JS glue, `mame-rbg-arcade/rbg_arcade.js|.html`, licenses, patches, fixtures, build scripts, `docs/emulator-builds/*`, `docs/qa/*` (including files historically renamed out of `docs/test-evidence/`).

### Rename handling

`filter-repo --analyze` showed renames from `docs/test-evidence/PH-05|PH-08/*.md` → `docs/emulator-builds/*` and `docs/qa/*`. Tip retained those destination paths with identical blob SHAs.

## Tip tree comparison

| Metric | Result |
|---|---|
| Paths before filter | 1063 |
| Paths after filter | 1063 |
| Path set vs original private tip | **Identical** (0 missing / 0 extra) |
| Blob SHA mismatches vs private tip | **0** |
| Unavoidable tip differences | **None** for retained files |

Commit count: private `229` → candidate `222` (empty commits dropped after path removal; expected).

## Authorship / messages

- Recent subjects match private tip lineage (merge `feat/platform-expansion-phase-1`, PH-12/13/14 docs preserved in rewritten history).
- **Cursor `Co-authored-by` trailers:** absent in candidate history (`CURSOR_TRAILER_ABSENT`).

## History cleanliness (candidate)

| Check | Result |
|---|---|
| Reachable `cores/**/*.wasm\|.data` | **0** |
| Reachable `docs/test-evidence/` | **0** |
| Git LFS pointers | **0** |
| `scripts/verify-core-lock.py --mode SOURCE_ONLY` | **PASS** |
| `scripts/check-no-private-cores-tracked.py` | **PASS** |
| `scripts/check-public-source-safety.py --expect-history-clean` | **PASS** |
| `scripts/audit-public-history.py --expect-clean` | **PASS** (`HISTORY_AUDIT_PASS`) |

Note: `docs/test-evidence.md` (markdown index) remains and is **not** in the removal manifest; it is not the Chromium-profile directory.

## Build / test results (candidate tree)

| Gate | Result | Notes |
|---|---|---|
| Frontend `tsc --noEmit` | **PASS** | |
| Frontend `eslint` | **PASS** (2 pre-existing warnings in `Player.tsx`) | |
| Frontend `vitest run` | **PASS** 13 files / 85 tests | |
| Django `manage.py test tests` | **PASS** 43 tests | Candidate tree; explicit site-packages path due to AppImage venv quirk |
| Django `makemigrations --check --dry-run` | **PASS** | No changes detected |
| `check-source-offer-gate.py` | **OK** (delivery still NOT_VERIFIED) | Expected |
| `check-browser-policy-consistency.py` | **PASS** | allowlist SHA `65efb6ed…` |
| `check-docs-hygiene.py` | **PASS** | |
| `scripts/test_browser_allowlist.py` | **PASS** 4 tests | |
| `check-public-release-go.py` | **STOP** (exit 1) | Independent product gate; not cleared by history sanitization |
| `ruff check apps/api` | **FAIL** (pre-existing on private tip) | Not introduced by filter; tip trees identical |

Full LOCAL_FULL / browser gameplay suites were **not** re-run with private WASM packs copied into the sanitized Git history (forbidden). Prior PH-12 evidence remains historical only.

## License / publication findings

- SOURCE_OFFER metadata/archives: integrity validated for authorized set; **recipient delivery still NOT_VERIFIED**.
- Legal counsel approvals: still pending (unchanged).
- Reproducible build gate still fails on missing private `rbg_arcade.wasm` in public-source layout (expected for SOURCE_ONLY).

## Candidate technical verdict

**HISTORY_SANITIZATION_CANDIDATE = PASS** (isolated experiment).  
**HISTORY_SANITIZED_TESTS = PASS** for tip-equivalent unit/type/lint/history auditors listed above.  

This does **not** authorize rewriting original `main`, pushing to GitHub, or flipping repository visibility.
