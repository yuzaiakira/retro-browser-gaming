# PDR acceptance matrix

`PASSED` means the stated PDR test was exercised with the indicated real implementation. `NOT_VERIFIED` means implementation may exist but the acceptance scenario was not completed. `BLOCKED_EXTERNAL` means the required environment/asset is unavailable. No status below implies full delivery while physical-device / staging / product-approval rows remain open.

| ID | Status | Evidence or next gate |
|---|---|---|
| API-001, API-002, API-003 | PASSED | 43 Django tests (`PH-11/django-tests-20261022.txt`); Compose `manage.py test` |
| API-004 | PASSED | Native PostgreSQL, authenticated S3 Range, Django/Next healthy in Compose |
| CAT-001 | PASSED (HTML5 + consoles) | Catalog install HTML5 + Genesis/PS1/PSP; Firefox install/offline; Orbit re-PASS 2026-10-22 after CSP/origin fix |
| CAT-002 | PASSED | Empty/error/offline UX (`PH-11/acceptance-gates-20261022.txt`) |
| DL-001–DL-012 | PASSED | Prior fault suite + Compose evidence (`PH-03/download-faults-20261020.md`) |
| DL-013 | PASSED (scoped) | 1 GiB Range + page JS heap bound; RSS unavailable via Playwright (`download-faults-rss-20261020.txt`) |
| OFF-001–OFF-003 | PASSED (HTML5) | Persistent-profile cold-start (`PH-02/offline-pwa-20261020.md`); Orbit player path re-validated 2026-10-22 |
| OFF-004 | PASSED (wasm core) | Deleted Genesis wasm.data offline; OPFS retained (`PH-02/offline-pwa-off004-core-20261020.md`) |
| OFF-005 | PASSED | Waiting SW does not disrupt Save state |
| EMU-001–EMU-004 | PASSED (scoped) | Gameplay + BlobFS + catalog offline; regression 2026-10-22 (`PH-11/emulator-regression-20261022.txt`); Android AUD-001 |
| EMU-005, EMU-006 | PASSED | Lifecycle + unsupported core (`PH-11/acceptance-gates-20261022.txt`) |
| CMP-001, CMP-002 | PASSED (unit) | `compatibility.test.ts` |
| IN-001 | PASSED (Chromium) | Keyboard → InputRouter (`PH-11`) |
| IN-002 | PASSED (simulated) | Gamepad API mock; Sprint 6 console + soak disconnect sim; **physical gamepad NOT_VERIFIED** |
| IN-002-P, IN-002-D | BLOCKED_EXTERNAL | No controller — `docs/physical-device-acceptance.md` + Sprint 6 checklist |
| IN-003, IN-004, IN-005 | PASSED (Chromium + Android physical) | Desktop sim + USB Android Chrome CDP (`PH-08`) |
| SAV-001 | PASSED | HTML5 + console offline load; Amiga/MSX saveState re-PASS 2026-10-22; Sprint 6 soak + final UX save/load |
| SAV-002, SAV-003 | PASSED | Delete keeps saves; invalid import rejected (`PH-11`); Sprint 6 slot isolation checks |
| SEC-001–SEC-003 | PASSED | Security evidence; product-approval + deploy `catalog.E001` (`PH-11/catalog-e001-20261022.txt`) |
| SEC-004 | PASSED | Hostile sandboxed HTML denied launcher IndexedDB (`PH-11`) |
| UX-001, UX-002 | PASSED (basic + Android) | Mobile layout + keyboard focus; Android fullscreen/orientation (`PH-08`) |
| DEP-001, DEP-002 | PASSED | Compose stack + proxy build path |
| IOS-001 | BLOCKED_EXTERNAL | No iOS device — `docs/physical-device-acceptance.md` |
| Staging HTTPS | BLOCKED_EXTERNAL | `docs/production-staging-verification.md` (local HTTPS ≠ staging) |
| PH-08 Android extras | PASSED (scoped) | Offline reverse-removed cold-start; Genesis/PS1/PSP on phone; AUD-001 |

## Gate verdicts

| Gate | Verdict |
|---|---|
| G01 | PASSED — native Compose stack |
| G02–G04 | PASSED — download recovery/performance (heap scoped; RSS unavailable) |
| G05 | PASSED (scoped) — console gameplay + catalog offline; Android AUD-001 |
| G06–G10 | PARTIAL — Chromium/Firefox + Android Chrome physical; WebKit catalog (no OPFS); gamepad/iOS/staging open |
| G11 | PARTIAL — Android PH-08 + AUD-001 closed; physical gamepad + iOS + staging remain |

**RELEASE CANDIDATE / NOT COMPLETE** — see `docs/RELEASE_CANDIDATE.md` and `docs/release-acceptance-report.md`. Remaining mandatory blockers: gamepad IN-002-P/D, iOS Safari IOS-001, production staging HTTPS, human product approval (pending / 0 approved). Optional EXPERIMENTAL platforms (Jaguar) and blocked cores are out of P0 scope unless PDR changes. N64 + ZX81 + **Atari ST** + **FDS** engineering acceptance: `VERIFIED_PLAYABLE` (Atari ST / FDS: Compose offline PWA PASS; OS PWA/physical NOT_VERIFIED; product approval pending). ColecoVision PH-12.2: `BLOCKED_EXTERNAL` pending lawful user BIOS.
