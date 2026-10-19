# PDR acceptance matrix

`PASSED` means the stated PDR test was exercised with the indicated real implementation. `NOT_VERIFIED` means implementation may exist but the acceptance scenario was not completed. `BLOCKED_EXTERNAL` means the required environment/asset is unavailable. No status below implies full delivery; PS1 and PSP remain mandatory blockers.

| ID | Status | Evidence or next gate |
|---|---|---|
| API-001, API-002, API-003 | PASSED | 28 Django tests, plus the native Compose run in `PH-01/compose-20261019.md` |
| API-004 | PASSED | Native PostgreSQL, authenticated S3 Range probe, Django readiness and Next.js are healthy in Compose (`PH-01/compose-20261019.md`) |
| CAT-001 | PASSED (HTML5) | `PH-02/test-run.txt`: catalog → download → install → play |
| CAT-002 | NOT_VERIFIED | Error/empty visual E2E matrix remains |
| DL-001 | PASSED (small asset) | Real HTTP 206 through authenticated S3 and the same-origin launcher gateway; browser install evidence in `PH-01/compose-20261019.md` |
| DL-002, DL-005, DL-006, DL-007, DL-008 | NOT_VERIFIED | Interrupted/reload/two-tab/crash browser tests outstanding |
| DL-003, DL-004 | PASSED (transport only) | Backend tests reject/handle 200 and 416; browser fault path outstanding |
| DL-009, DL-010, DL-011, DL-012, DL-013 | NOT_VERIFIED | Version/hash/quota/cancel/1 GiB acceptance suite outstanding |
| OFF-001 | NOT_VERIFIED | Offline library passed, full cached catalog reload not yet proven |
| OFF-002, OFF-003 | PASSED (HTML5) | Offline boot/save + three reloads in `PH-02/test-run.txt` |
| OFF-004, OFF-005 | NOT_VERIFIED | Core eviction and SW update fault tests outstanding |
| EMU-001 | NOT_VERIFIED | Real legal Genesis boot/core controls in `PH-05`; gameplay evidence still required |
| EMU-002 | BLOCKED_EXTERNAL_ASSET | Legal reviewed PS1 disc bundle plus multi-file adapter validation unavailable |
| EMU-003, EMU-004 | BLOCKED_EXTERNAL_ASSET | Legal PSP fixture/threaded gameplay and large-file run unavailable |
| EMU-005, EMU-006 | NOT_VERIFIED | Lifecycle stress and negative E2E outstanding |
| CMP-001, CMP-002 | PASSED (unit) | `compatibility.test.ts` accurately blocks threads / limits unknown quota |
| IN-001 | NOT_VERIFIED | Mapping unit test only; visual game-control proof outstanding |
| IN-002 | NOT_VERIFIED | No physical/simulated browser gamepad acceptance pass |
| IN-003, IN-004, IN-005 | NOT_VERIFIED | Mobile touch and lifecycle E2E outstanding |
| SAV-001 | PASSED (HTML5) | Real frame state save/load across offline reload |
| SAV-002, SAV-003 | NOT_VERIFIED | Deletion and invalid-import acceptance tests outstanding |
| SEC-001 | PASSED (scoped) | Web source/build scan found no server secret variable identifiers |
| SEC-002 | PASSED (headers/S3 scope) | Browser COOP/COEP headers, authenticated SeaweedFS S3 Range, and same-origin gateway evidence |
| SEC-003 | PASSED | Backend publication/license tests |
| SEC-004 | NOT_VERIFIED | HTML sandbox storage-escape acceptance test outstanding |
| UX-001 | PASSED (360px Chromium) | `catalog-mobile.png`, overflow assertion |
| UX-002 | PASSED (basic Chromium) | Keyboard focus assertion; full a11y audit outstanding |
| DEP-001 | PASSED | Docker Compose built and ran native PostgreSQL, persistent S3-compatible SeaweedFS, Django and Next.js; live storage probe and Chromium E2E passed (`PH-01/compose-20261019.md`) |
| DEP-002 | PASSED (workspace scope) | `scripts/compose.sh` resolves the injected Docker proxy at runtime, passes its CA as a BuildKit secret, and the README sequence was executed successfully |

## Gate verdicts

| Gate | Verdict |
|---|---|
| G01 | PASSED — native PostgreSQL, persistent authenticated S3-compatible storage, Django and Next.js ran in Compose with browser E2E evidence |
| G02–G04 | NOT_VERIFIED — implemented and browser-tested for the legal HTML5 release; recovery/fault suite pending |
| G05 | NOT_VERIFIED — real Genesis core boot only; PS1 and PSP prevent pass |
| G06–G10 | NOT_VERIFIED — implementation exists, acceptance suite/device coverage incomplete |
| G11 | BLOCKED — mandatory P0 requirements have not all passed |
