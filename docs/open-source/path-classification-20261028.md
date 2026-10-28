# Path classification report (2026-10-28)

**Private tip:** `1f4ddbeba62971c43162889c17c98308662833b6`  
**Purpose:** Decide what must stay out of a public SOURCE candidate vs what must remain.

## REMOVE from public-reachable Git history (filter-repo)

| Category | Paths | Action |
|---|---|---|
| Emulator binary payloads | 59 paths in `history-removal-manifest.txt` | `--invert-paths` |
| Working-tree provisioned binaries | `apps/web/public/cores/**/*.data\|*.wasm` | Already tip-untracked; history filter |
| Private runtime | `.private-runtime/**` | Never tracked; keep gitignored |
| Portable backups | `RetroBrowserGaming-Asset-Backup*` | Outside repo / gitignored |
| Secrets | `.env` | gitignored; never commit |

## KEEP in public SOURCE

| Category | Examples |
|---|---|
| Application source | `apps/api`, `apps/web` (TS/JS UI), `packages/` |
| Lockfiles / deps | `requirements*.lock`, `package-lock.json` |
| Legal fixtures | `fixtures/**` MIT/GPL/CC0 homebrew |
| Emulator **JS** loaders | Tracked EmulatorJS/jsdos/js2me loaders (not `.data`/`.wasm`) |
| GPL patches / build recipes | `scripts/patches/bluemsx/**`, rebuild scripts |
| Notices / CS docs | `LICENSES/`, `docs/open-source/third-party-notices.md`, corresponding-source |
| Tests | Playwright/Vitest/Django tests (not ephemeral profiles) |
| Core lock + allowlists | `docs/core-package-lock.json`, browser allowlist JSON |

## OPTIONAL / review (not auto-deleted)

| Category | Notes |
|---|---|
| Large test-evidence screenshots | Engineering evidence; keep unless counsel wants a slimmer public tree |
| Proposed LICENSE texts | Keep under `docs/open-source/proposed-licenses/` until owner enacts root LICENSE |
| Agent skill docs | Keep (no private binaries) |

## Do NOT delete when cleaning

- Copyright notices, LICENSE texts under `LICENSES/`
- Corresponding-source matrices and BlueMSX patches
- Dependency locks
- Authorized homebrew fixtures
- `docs/PDR.md` and acceptance docs

## Credential scan (tip)

`scripts/check-public-source-safety.py` tip scan: high-confidence patterns only.  
**Finding:** none requiring rotation as of this report (placeholder `.env.example` keys remain placeholders).  
History rewrite alone is **not** credential revocation if a real secret is ever found.
