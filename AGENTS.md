# Retro Browser Gaming — engineering guide

## Mission and authority

Deliver the PDR-defined browser launcher: Django/DRF, PostgreSQL, SeaweedFS S3-compatible storage, Next.js/TypeScript PWA, OPFS/IndexedDB, and isolated WebAssembly emulators. `docs/PDR.md` is the product authority. For a conflict, use this order: PDR → acceptance matrix → architecture/ADR → code and tests → handover/execution state.

## Start every task

Read `docs/EXECUTION_STATE.md`, the relevant acceptance-matrix IDs, and the matching skill in `.agents/skills/`. Inspect code and existing evidence before editing. Preserve the `main` history, native Compose stack, and working boundaries. Do not reorganize code solely for style.

For every emulator-related change, also read and update `docs/EMULATOR_SUPPORT_MATRIX.md`. Its checkbox represents real interactive browser gameplay only; retain separate capability/status fields and evidence links.

Treat J2ME as P1. Do not vendor a Java ME runtime or JAR fixture until its runtime assets, license, self-hosted offline behavior, isolation, RMS persistence, and real browser gameplay have been verified. FreeJ2ME-Web's CheerpJ dependency is not acceptable for PWA offline support.

## Repository map

- `apps/api/`: Django/DRF catalog, importer, range transport, S3 integration, tests.
- `apps/web/`: Next App Router, PWA, OPFS/IDB download worker, player and emulator frame.
- `docs/`: PDR, architecture, acceptance status, evidence, handover, execution state.
- `scripts/`: Compose wrapper, browser smoke and core-lock checks; `compose.yaml` is the native stack.

## Engineering rules

Maintain clean boundaries: UI → feature services → storage/API; player code communicates with emulator frames only through the versioned adapter. Validate external data at boundaries, retain immutable manifest identities, use bounded streaming for large bytes, and retain backward-compatible persisted-data handling. Prefer the smallest maintainable change that satisfies a PDR acceptance scenario.

## Skill selection

Use `software-architecture` for cross-boundary decisions; `django-backend` for API/storage/importer work; `nextjs-frontend` for UI; `browser-emulation` for core/frame/disc work; `offline-download-storage` for OPFS/Range; `offline-pwa-and-controls` for offline/input; `security-and-licensing` for assets/isolation; `testing-and-verification` for all evidence; and `devops-and-release` for Compose, CI, commits and releases. Read every applicable skill before implementation.

## Verification and release gates

Map each change to its PDR ID, add a regression test that exercises real behavior, and run targeted checks plus affected build/lint/type checks. `PASSED` requires reproducible real evidence: code inspection, mocks, emulator initialization, or a screenshot alone never suffice. Update `docs/acceptance-matrix.md`, evidence, and `docs/EXECUTION_STATE.md` after verified changes. P0 is complete only when every mandatory gate is genuinely passed.

## Security, assets, and Git

Never add commercial ROMs/BIOSes, secrets, credentials, or unreviewed assets. Legal fixtures require provenance, license, source/build instructions, and SHA-256. Keep COOP/COEP, integrity validation, and TLS verification intact. Make focused commits using the configured project identity; push, deploy, publish, or perform destructive operations only when authorized. Regenerate release artifacts only from a committed revision.

## Continuation

Before ending a session, record verified results, blockers, decisions, exact commands, and the next concrete task in `docs/EXECUTION_STATE.md`. On recovery, do not repeat completed discovery or mark externally unavailable hardware/assets as passed.
