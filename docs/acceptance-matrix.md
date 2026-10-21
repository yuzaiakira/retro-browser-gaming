# PDR acceptance matrix

`PASSED` means the stated PDR test was exercised with the indicated real implementation. `NOT_VERIFIED` means implementation may exist but the acceptance scenario was not completed. `BLOCKED_EXTERNAL` means the required environment/asset is unavailable. No status below implies full delivery while physical-device rows remain open.

| ID | Status | Evidence or next gate |
|---|---|---|
| API-001, API-002, API-003 | PASSED | 28 Django tests; Compose `manage.py test` |
| API-004 | PASSED | Native PostgreSQL, authenticated S3 Range, Django/Next healthy in Compose |
| CAT-001 | PASSED (HTML5 + consoles) | Catalog install HTML5 + Genesis/PS1/PSP; Firefox install/offline |
| CAT-002 | PASSED | Empty/error/offline UX (`PH-07/acceptance-gates-20261020.md`) |
| DL-001–DL-012 | PASSED | Prior fault suite + Compose evidence (`PH-03/download-faults-20261020.md`) |
| DL-013 | PASSED (scoped) | 1 GiB Range + page JS heap bound; RSS unavailable via Playwright; WASM not used in download path (`download-faults-rss-20261020.txt`) |
| OFF-001–OFF-003 | PASSED (HTML5) | Persistent-profile cold-start (`PH-02/offline-pwa-20261020.md`) |
| OFF-004 | PASSED (wasm core) | Deleted `/cores/.../genesis_plus_gx-wasm.data` offline; OPFS retained; recoverable reinstall (`PH-02/offline-pwa-off004-core-20261020.md`) |
| OFF-005 | PASSED | Waiting SW does not disrupt Save state |
| EMU-001–EMU-004 | PASSED (scoped) | Gameplay + BlobFS + catalog offline; Android AUD-001 human-heard Genesis |
| EMU-005, EMU-006 | PASSED | Lifecycle + unsupported core (`PH-07/acceptance-gates-20261020.md`) |
| CMP-001, CMP-002 | PASSED (unit) | `compatibility.test.ts` |
| IN-001 | PASSED (Chromium) | Keyboard → InputRouter command mapping |
| IN-002 | PASSED (simulated) | Gamepad API mock; **physical gamepad NOT_VERIFIED** (no controller) |
| IN-003, IN-004, IN-005 | PASSED (Chromium + Android physical) | Desktop sim + USB Android Chrome CDP (`PH-08/android-physical-20261020.txt`) |
| SAV-001 | PASSED | HTML5 + console offline load |
| SAV-002, SAV-003 | PASSED | Delete keeps saves; invalid import rejected |
| SEC-001–SEC-003 | PASSED | Prior security evidence; companion extension publish gate + lock digests (`test_catalog`, `PH-05` seed refresh) |
| SEC-004 | PASSED | Hostile sandboxed HTML denied launcher IndexedDB |
| UX-001, UX-002 | PASSED (basic + Android) | Mobile layout + keyboard focus; Android fullscreen/orientation (`PH-08`) |
| DEP-001, DEP-002 | PASSED | Compose stack + proxy build path |
| PH-08 Android extras | PASSED (scoped) | Offline reverse-removed cold-start; Genesis/PS1/PSP on phone; AUD-001 human-heard PASSED |

## Gate verdicts

| Gate | Verdict |
|---|---|
| G01 | PASSED — native Compose stack |
| G02–G04 | PASSED — download recovery/performance (heap scoped; RSS unavailable) |
| G05 | PASSED (scoped) — console gameplay + catalog offline; Android AUD-001 human-heard Genesis |
| G06–G10 | PARTIAL — Chromium/Firefox + Android Chrome physical (incl. AUD-001); WebKit catalog (no OPFS install); gamepad/iOS open (`PH-08`) |
| G11 | PARTIAL — Android PH-08 + AUD-001 closed; physical gamepad + iOS remain |

**RELEASE CANDIDATE / NOT COMPLETE** — see `docs/RELEASE_CANDIDATE.md`. Remaining mandatory physical blockers (deferred): gamepad IN-002, iOS Safari IOS-001. Software gameplay + catalog offline includes consoles through NGP/NGPC, MS-DOS, Genesis Pong, and catalog expansion Falling / Big2Small / Nonogram / Sushi Nights (`PH-05/catalog-expansion-20261021.md`), plus first-party J2ME on dedicated origin (`PH-06`). Sega 32X/CD remain blocked; RC still not COMPLETE.
