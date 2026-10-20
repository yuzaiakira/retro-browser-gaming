# PDR acceptance matrix

`PASSED` means the stated PDR test was exercised with the indicated real implementation. `NOT_VERIFIED` means implementation may exist but the acceptance scenario was not completed. `BLOCKED_EXTERNAL` means the required environment/asset is unavailable. No status below implies full delivery; PS1 and PSP remain mandatory blockers.

| ID | Status | Evidence or next gate |
|---|---|---|
| API-001, API-002, API-003 | PASSED | 28 Django tests, plus the native Compose run in `PH-01/compose-20261019.md`; re-run 2026-10-20 via Compose `manage.py test` |
| API-004 | PASSED | Native PostgreSQL, authenticated S3 Range probe, Django readiness and Next.js are healthy in Compose (`PH-01/compose-20261019.md`) |
| CAT-001 | PASSED (HTML5 + consoles) | HTML5 in `PH-02/test-run.txt`; Genesis/PS1/PSP catalog install in `PH-05/catalog-console-offline-20261020.md`; Firefox install/offline library in `PH-02/browser-matrix-20261020.md` |
| CAT-002 | NOT_VERIFIED | Error/empty visual E2E matrix remains |
| DL-001 | PASSED (small asset) | Real HTTP 206 through authenticated S3 and the same-origin launcher gateway; browser install evidence in `PH-01/compose-20261019.md` |
| DL-002 | PASSED (browser fault injection) | Truncated Range body rejected as `TRUNCATED_CHUNK` (`PH-03/download-faults-20261020.md`) |
| DL-008 | PASSED (browser fault injection) | Journaled chunk 0 retained across resume; unjournaled tail re-fetched (`PH-03/download-faults-20261020.md`) |
| DL-006 | PASSED (100 MiB browser restart) | Browser process termination after two journaled OPFS chunks recovered in a new Chromium process without re-fetching those chunks (`PH-03/download-faults-20261019.md`) |
| DL-003, DL-004 | PASSED (browser fault injection) | Real download worker rejects injected HTTP 200 and 416 without installing (`PH-03/download-faults-20261019.md`) |
| DL-005 | PASSED (100 MiB) | A real worker retried an injected connection reset during a 100 MiB multi-range transfer, then recovered across browser restart and final SHA-256 verification (`PH-03/download-faults-20261019.md`) |
| DL-007 | PASSED (small asset) | Two Chromium tabs contended for the real Web Lock; one writer installed and the other received `DOWNLOAD_BUSY_OTHER_TAB` |
| DL-009 | PASSED (browser fault injection) | Changed asset version/identity starts a new key and does not reuse old chunks (`PH-03/download-faults-20261020.md`) |
| DL-010 | PASSED (browser fault injection) | Altered bytes in a valid 206 fail final streaming SHA-256 and remain non-installed |
| DL-011 | PASSED (browser fault injection) | Worker rejects with `QUOTA_INSUFFICIENT` before Range requests (`PH-03/download-faults-20261020.md`) |
| DL-012 | PASSED (browser fault injection) | Pause then cancel/delete clears journal, downloads, and OPFS (`PH-03/download-faults-20261020.md`) |
| DL-013 | PASSED (1 GiB browser) | Deterministic 1 GiB Range download verified; page JS heap growth ~2.4 MiB (`PH-03/download-faults-20261020.md`) |
| OFF-001 | PASSED (HTML5 cold-start) | Fresh Chromium process, network off before navigate; offline library + Orbit Catch (`PH-02/offline-pwa-20261020.md`) |
| OFF-002, OFF-003 | PASSED (HTML5) | Offline boot/save cold-start + prior three-reload evidence (`PH-02/offline-pwa-20261020.md`, `PH-02/test-run.txt`) |
| OFF-004, OFF-005 | PASSED (HTML5 fault) | OPFS eviction fails closed; waiting SW does not disrupt Save state (`PH-02/offline-pwa-20261020.md`) |
| EMU-001 | PASSED (scoped) | Gameplay + chunked load (`PH-05/genesis-gameplay-20261019.md`, `bounded-memory-20261020.md`) plus catalog install + fresh-process offline save/load (`PH-05/catalog-console-offline-20261020.md`); physical audio remains open |
| EMU-002 | PASSED (scoped) | Core-smoke gameplay/input/save (`PH-05/ps1-gameplay-20261020.md`) plus catalog install + fresh-process offline save/load (`PH-05/catalog-console-offline-20261020.md`); physical audio remains open |
| EMU-003 | PASSED (scoped) | Core-smoke gameplay/input/save (`PH-05/psp-gameplay-20261020.md`) plus catalog install + fresh-process offline save/load (`PH-05/catalog-console-offline-20261020.md`); physical audio remains open |
| EMU-004 | PASSED (scoped) | On-demand BlobFS (≤8 MiB SAB windows): 512 MiB + 1 GiB random-access + PSP Dot gameplay without MEMFS full-file copy (`PH-05/ondemand-media-20261020.md`); Playwright PID/RSS sampling unavailable here |
| EMU-005, EMU-006 | NOT_VERIFIED | Lifecycle stress and negative E2E outstanding |
| CMP-001, CMP-002 | PASSED (unit) | `compatibility.test.ts` accurately blocks threads / limits unknown quota; large discs require isolation |
| IN-001 | NOT_VERIFIED | Mapping unit test only; visual game-control proof outstanding |
| IN-002 | NOT_VERIFIED | No physical/simulated browser gamepad acceptance pass |
| IN-003, IN-004, IN-005 | NOT_VERIFIED | Mobile touch and lifecycle E2E outstanding |
| SAV-001 | PASSED (HTML5 + consoles) | HTML5 offline reload (`PH-02/test-run.txt`); Genesis/PS1/PSP catalog offline load (`PH-05/catalog-console-offline-20261020.md`) |
| SAV-002, SAV-003 | NOT_VERIFIED | Deletion and invalid-import acceptance tests outstanding |
| SEC-001 | PASSED (scoped) | Web source/build scan found no server secret variable identifiers |
| SEC-002 | PASSED (headers/S3 scope) | Browser COOP/COEP headers, authenticated SeaweedFS S3 Range, and same-origin gateway evidence |
| SEC-003 | PASSED | Backend publication/license tests |
| SEC-004 | NOT_VERIFIED | HTML sandbox storage-escape acceptance test outstanding |
| UX-001 | PASSED (360px Chromium) | `catalog-mobile.png`, overflow assertion |
| UX-002 | PASSED (basic Chromium) | Keyboard focus assertion; full a11y audit outstanding |
| DEP-001 | PASSED | Docker Compose built and ran native PostgreSQL, persistent S3-compatible SeaweedFS, Django and Next.js; live storage probe and Chromium E2E passed (`PH-01/compose-20261019.md`); re-verified healthy on 2026-10-20 |
| DEP-002 | PASSED (workspace scope) | `scripts/compose.sh` resolves the injected Docker proxy at runtime, passes its CA as a BuildKit secret, and the README sequence was executed successfully |

## Gate verdicts

| Gate | Verdict |
|---|---|
| G01 | PASSED — native PostgreSQL, persistent authenticated S3-compatible storage, Django and Next.js ran in Compose with browser E2E evidence |
| G02–G04 | PASSED (download recovery/performance) — truncated chunk, crash-before-journal resume, identity change, quota, cancel/delete, and 1 GiB bounded-memory browser evidence recorded 2026-10-20 |
| G05 | PASSED (scoped) — Genesis/PS1/PSP gameplay + BlobFS + catalog-installed fresh-process offline save/load verified; physical audio/controllers remain open |
| G06–G10 | PARTIAL — Chromium + Playwright Firefox catalog/install/offline library passed; Playwright WebKit blocked by host libs; physical gamepad/touch/iOS Safari NOT_VERIFIED (`PH-02/browser-matrix-20261020.md`) |
| G11 | PARTIAL — OFF-001–005 and catalog console offline cold-start passed; physical device/gamepad/touch/WebKit host deps and optional PID/RSS sampling still open |
