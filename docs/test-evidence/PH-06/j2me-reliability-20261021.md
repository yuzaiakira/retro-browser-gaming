# J2ME dedicated-origin reliability — 2026-10-21

## Scope

Atomic Service Worker cache install, SHA-256 runtime integrity, prefer-newer RMS migration/rollback, and corruption recovery. Does not rewrite the js2me VM or verified MIDlets.

## Automated evidence

| Gate | Result | Artifact |
| --- | --- | --- |
| SW integrity (bad SHA, path reject, preserve prior, no auto-skipWaiting, verify corruption) | PASSED | `j2me-sw-integrity-20261021.json` |
| Cache recovery (corrupt → offline fail → repair → RMS intact) | PASSED | `j2me-cache-recovery-20261021.json` |
| RMS rollback prefer-newer (deliberately different versions) | PASSED | `j2me-rms-rollback-safety-20261021.json` |
| Vitest merge planner | PASSED (8) | `apps/web/src/features/j2me-rms-migrate.test.ts` |
| Dedicated catalog offline Dot/Paddle/Notes | PASSED | `catalog-j2me-dedicated-offline-reliability-run-20261021.txt` |
| Security / multi / Dot / DOS / SNES / core-lock | PASSED | companion run logs under PH-05/PH-06 |

## Not verified

- HTTPS production/staging certificates and secure-context SW on non-localhost hosts.
- Physical gamepad (IN-002) and iOS (IOS-001) — still BLOCKED_EXTERNAL.
- Arbitrary JAR execution (remain disabled).
