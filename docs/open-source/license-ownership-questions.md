# Root LICENSE ownership — questions for owner / counsel

**Status:** `BLOCKED_HUMAN` (possible `BLOCKED_RIGHTS`)  
**Proposed default:** MIT for first-party code only — **not enacted**.  
**Proposed copyright line (awaiting written authority confirmation):** `Copyright (c) 2026 Akira Yuzai`  
**Scope map:** `docs/open-source/first-party-license-scope.md`

Git author names (`Akira`, `Akira Yuzai`, Cursor co-author trailers) are **not** sufficient to determine copyright ownership.

## Questions requiring human answers before enacting root LICENSE

1. Confirm that **Akira Yuzai** personally owns (or is authorized to license) the first-party application code identified in `first-party-license-scope.md`.
2. Do employment / contractor agreements assign any of that code to a company instead?
3. Are there human contributors whose permission is required beyond the named copyright holder?
4. Confirm MIT (vs Apache-2.0 / GPL-3.0) for first-party code after reviewing `proposed-licenses/`.
5. Confirm third-party boundaries remain: EmulatorJS GPL-3.0, jsdos GPL-2.0, fixtures as labeled — not relicensed by root MIT.

## What the agent prepared

- Proposed MIT / Apache-2.0 / GPL-3.0 texts under `docs/open-source/proposed-licenses/`
- Scope banners stating first-party-only application
- Owner approval checklist item for LICENSE enactment

## What the agent will not do without authorization

- Commit a root `LICENSE`
- Change ownership claims in existing notices
- Relicense third-party trees
