---
name: testing-and-verification
description: Produce trustworthy unit, integration, browser, fault-injection, performance and release-acceptance evidence for PDR gates.
---

# Testing and verification

Use for every feature completion, test/evidence change, PDR matrix update, or release decision.

- Begin with the exact PDR/acceptance ID, prior evidence and the real failure mode. Add a regression test that can fail for the corrected behavior.
- Backend: run focused Django tests and lint. Frontend: run focused browser tests plus `npm test`, lint, typecheck and build as scope warrants. Compose gates require native PostgreSQL/S3/Django/Next behavior, not YAML parsing.
- Browser tests must use real OPFS, IndexedDB, worker, service worker and emulator core when relevant. Network interception may inject faults but must not replace the component under test.
- Capture commands, versions, outputs, screenshots/measurements, fixture provenance, and limitations under `docs/test-evidence/`. Do not overwrite prior evidence with a claim.
- `PASSED` means the stated scenario really executed. Mark mocks, partial scope, unavailable browsers and physical hardware truthfully; boot callbacks/screenshots alone are not gameplay.

After verification, update acceptance status, handover if material, and `docs/EXECUTION_STATE.md`. Run `git diff --check` before commit.
