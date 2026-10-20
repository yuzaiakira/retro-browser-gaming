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
| EMU-001–EMU-004 | PASSED (scoped) | Gameplay + BlobFS + catalog offline; physical audio open |
| EMU-005, EMU-006 | PASSED | Lifecycle + unsupported core (`PH-07/acceptance-gates-20261020.md`) |
| CMP-001, CMP-002 | PASSED (unit) | `compatibility.test.ts` |
| IN-001 | PASSED (Chromium) | Keyboard → InputRouter command mapping |
| IN-002 | PASSED (simulated) | Gamepad API mock; **physical gamepad NOT_VERIFIED** |
| IN-003, IN-004, IN-005 | PASSED (Chromium sim) | Multitouch/layout/blur; **physical phone NOT_VERIFIED** |
| SAV-001 | PASSED | HTML5 + console offline load |
| SAV-002, SAV-003 | PASSED | Delete keeps saves; invalid import rejected |
| SEC-001–SEC-003 | PASSED | Prior security evidence |
| SEC-004 | PASSED | Hostile sandboxed HTML denied launcher IndexedDB |
| UX-001, UX-002 | PASSED (basic) | Mobile layout + keyboard focus |
| DEP-001, DEP-002 | PASSED | Compose stack + proxy build path |

## Gate verdicts

| Gate | Verdict |
|---|---|
| G01 | PASSED — native Compose stack |
| G02–G04 | PASSED — download recovery/performance (heap scoped; RSS unavailable) |
| G05 | PASSED (scoped) — console gameplay + catalog offline; physical audio open |
| G06–G10 | PARTIAL — Chromium/Firefox + container WebKit catalog; WebKit install correctly disabled (no OPFS); physical gamepad/touch/iOS/human audio open (`PH-02/webkit-orbit-capability-*`, `PH-08`) |
| G11 | PARTIAL — automated P0 closed; PH-08 physical/iOS/AUD-001 remain |

**RELEASE CANDIDATE / NOT COMPLETE** — see `docs/final-handover.md`. Physical PH-08 rows are blockers until hardware evidence exists.
