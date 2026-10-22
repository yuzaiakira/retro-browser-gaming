# Release candidate checkpoint — 2026-10-22

**Verdict: RELEASE CANDIDATE / NOT COMPLETE**

Audit base SHA `8d24d9fdc1f9d3957e3a887d2ae5adb87280945f` plus local fix commits from the 2026-10-22 release-readiness pass. This checkpoint freezes shipped vs verified vs still-blocking P0.

## Implemented

- Django/DRF catalog, importer, manifests, Range/S3 transport, Compose stack (PostgreSQL + SeaweedFS + API + Next standalone + Host-routed edge).
- Next.js PWA: discovery, library, downloads, player, diagnostics, OPFS/IDB downloader, shell SW.
- Emulator adapters via versioned frame protocol (HTML5, Genesis family, Nintendo handhelds/consoles, Atari family subset, PCE/WS/NGP, computers MSX/C64/Spectrum/Amiga/CPC, NDS, jsdos, js2me, PS1, PSP threaded).
- Keyboard / simulated gamepad / touch; saves; J2ME dedicated-origin + RMS.
- Catalog governance: DISTRIBUTION / ENGINEERING / PRODUCT layers + `catalog.E001`.

## Verified (real evidence)

| Area | Status | Pointer |
|---|---|---|
| Native Compose + API tests | PASSED | `PH-01`, `PH-11/django-tests-20261022.txt` (43 OK) |
| Downloads / DL-013 scoped | PASSED | `PH-03` |
| Offline PWA + OFF-004 | PASSED | `PH-02` |
| Console gameplay + catalog offline | PASSED (scoped) | `PH-05`; regression `PH-11/emulator-regression-20261022.txt` |
| Orbit HTML5 after CSP blob + origin sentinel fix | PASSED | `PH-11/acceptance-gates-20261022.txt`, `orbit-fixed.png` |
| Amiga saveState after probe-scope fix | PASSED | `PH-11/amiga-fix-20261022.txt` |
| J2ME dedicated-origin offline + SW integrity | PASSED (scoped) | `PH-06` |
| Local trusted HTTPS dual-host | LOCAL_HTTPS_VERIFIED | `PH-06/j2me-local-https-20261021.json` — **not** staging |
| HTTPS production / staging | **BLOCKED_EXTERNAL** | `docs/production-staging-verification.md` |
| Automated acceptance gates | PASSED | `PH-11/acceptance-gates-20261022.txt` |
| Android Chrome physical + AUD-001 | PASSED | `PH-08` |
| Playwright WebKit capability (no OPFS) | PASSED as capability gate | `PH-02/webkit-orbit-capability-*` |
| Core lock | PASSED | 373 files |

## External blockers (mandatory)

| ID | Status | Runbook |
|---|---|---|
| IN-002-P / IN-002-D | BLOCKED_EXTERNAL | `docs/physical-device-acceptance.md` |
| IOS-001 | BLOCKED_EXTERNAL | same |
| Staging HTTPS | BLOCKED_EXTERNAL | `docs/production-staging-verification.md` |
| Product approval | NOT_VERIFIED (42 pending / 0 approved) | `docs/catalog-product-approval-report-20261021.md` |

## Remaining release acceptance

1. Clear physical / iOS / staging rows with dated evidence, **or** explicit PDR change (not done).
2. Human product-approve only intended public titles.
3. Tag only from a clean committed revision with matching evidence.

Full audit: `docs/release-acceptance-report.md`. Ops checklist: `docs/release-manager-handover.md`.
