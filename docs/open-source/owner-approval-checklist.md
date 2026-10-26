# Owner approval checklist — PUBLIC_REPOSITORY_READY_FOR_OWNER_APPROVAL

**Do not publish, push, change visibility, or enact a root LICENSE until each applicable box is explicitly approved.**

## 1. Root application license & copyright holder

- [ ] Confirm copyright holder legal name (proposal uses `Akira Yuzai / Retro Browser Gaming contributors` — **verify company assignment**)
- [ ] Choose one: **MIT** (recommended) / Apache-2.0 / GPL-3.0
- [ ] Exact proposed files: `docs/open-source/proposed-licenses/`
- [ ] After choice: copy to root `LICENSE` on **private** `main` (owner action)

## 2. Legal / compliance reviewer

- [ ] Review `docs/open-source/legal-review-package.md`
- [ ] Review `docs/open-source/corresponding-source-matrix.json` and offer package
- [ ] Accept or escalate `NEEDS_LEGAL_REVIEW` gaps (`81_eo`, `virtualjaguar_js`)

## 3. Sanitized candidate SHA

- [ ] Approve candidate tip **`698c3afc28b6b2acd2cb360d015a923d0c662a04`** (from private `5b9359f…`) **or** re-filter after root LICENSE / newer tip
- [ ] Confirm `PUBLIC_BROWSER` allowlist (55 authorized / 4 NOT_CLEARED) is accepted
- [ ] Confirm candidate was built from the intended private tip before push

## 4. History-removal summary

- [ ] 59 paths in `history-removal-manifest.txt`
- [ ] Candidate history clean of those paths
- [ ] Tip tree matches private tip tracked files

## 5. Browser-distributed components & corresponding source

- [ ] Understand private binaries are served only when provisioned
- [ ] BlueMSX: patches in `scripts/patches/bluemsx/`
- [ ] Stock EJS cores: pin + lock hashes
- [ ] Company will host corresponding-source offer URL when serving GPL WASM
- [ ] Withhold product redistribution of `81_eo` / `virtualjaguar_js` until gaps closed

## 6. Independent backup confirmation

- [ ] Primary portable backup verified (59 files)
- [ ] Immutable OS backup untouched
- [ ] Second copy on independent media created (`docs/open-source/second-backup-commands.md`)

## 7. New public repository name

- [ ] Proposed name: `retro-browser-gaming` **public fork/new repo** (owner picks exact GitHub name, e.g. `retro-browser-gaming-public`)
- [ ] Keep `yuzaiakira/retro-browser-gaming` **private**

## 8. Public CI readiness

- [ ] Workflow uses `SOURCE_ONLY` + private-core track check + backup unit tests
- [ ] No job requires company-private `.data`/`.wasm`

## 9. No private assets uploaded

- [ ] `.private-runtime/` ignored
- [ ] `RetroBrowserGaming-Asset-Backup*` ignored / dockerignored
- [ ] Corresponding-source offer may be published; **binaries stay offline** unless separately authorized

## 10. Separation: public SOURCE vs PUBLIC ALPHA deployment

- [ ] Public GitHub = source + notices + legal fixtures (SOURCE_ONLY)
- [ ] Public Alpha runtime = separate deploy with product-approved catalog + authorized provisioned cores
- [ ] No automatic product approvals; `CATALOG_ALLOW_ENGINEERING=false` in prod-like envs

## Explicit STOP until approval

- Create new GitHub repository  
- Change private repo visibility  
- Push / force-push / tag / deploy / attach release binaries  
