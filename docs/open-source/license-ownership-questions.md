# Root LICENSE ownership — questions for owner / counsel

**Status:** `BLOCKED_HUMAN` (possible `BLOCKED_RIGHTS`)  
**Proposed default:** MIT for first-party code only — **not enacted**.

Git author names (`Akira`, `Akira Yuzai`, Cursor co-author trailers) are **not** sufficient to determine copyright ownership.

## Questions requiring human answers

1. Is first-party code owned by an individual, a company, or jointly?
2. Do employment / contractor agreements assign copyright to a company?
3. Are there contributors whose permission is required beyond the primary author?
4. Exact copyright line for the root LICENSE (legal name + year)?
5. Confirm MIT vs Apache-2.0 vs GPL-3.0 after reviewing `proposed-licenses/`.
6. Confirm third-party boundaries remain: EmulatorJS GPL-3.0, jsdos GPL-2.0, fixtures as labeled.

## What the agent prepared

- Proposed MIT / Apache-2.0 / GPL-3.0 texts under `docs/open-source/proposed-licenses/`
- Scope banners stating first-party-only application
- Owner approval checklist item for LICENSE enactment

## What the agent will not do without authorization

- Commit a root `LICENSE`
- Change ownership claims in existing notices
- Relicense third-party trees
