# Release acceptance report — 2026-10-22

## Verdict

**NOT READY** for complete P0 release tag.

Software Compose/browser gates re-verified; two release-blocking defects fixed this session. Mandatory external gates remain open.

| Gate class | Result |
| --- | --- |
| Local Compose + Django + storage | PASS |
| Automated acceptance (CAT/EMU/IN/SAV/SEC scoped) | PASS |
| Representative emulator regression | PASS |
| Core lock | PASS — 373 files |
| Physical gamepad IN-002-P/D | **BLOCKED_EXTERNAL** |
| iOS Safari IOS-001 | **BLOCKED_EXTERNAL** |
| Production staging HTTPS | **BLOCKED_EXTERNAL** |
| Human product approval | **NOT_VERIFIED** (0 approved / 42 pending) |

---

## Identity

| Field | Value |
| --- | --- |
| Audit base commit | `8d24d9fdc1f9d3957e3a887d2ae5adb87280945f` |
| Verification date (UTC) | 2026-10-22 |
| Stack | PostgreSQL 17 + SeaweedFS + Django/Gunicorn + Next standalone + nginx edge |
| Frontend package | `retro-web@0.2.0` |
| Core lock | `CORE_LOCK_OK 373 files` (`docs/core-package-lock.json`) |

---

## Defects found and fixed this session

| Defect | Root cause | Fix | Evidence |
| --- | --- | --- | --- |
| Orbit / native-html hung on “Starting the local runtime…” | (1) Launcher CSP `frame-src` omitted `blob:` after J2ME dedicated-origin CSP; (2) FrameAdapter compared `event.origin` to literal `'*'`, dropping opaque `"null"` origins | `next.config.mjs` add `blob:` to `frame-src`; `isAllowedMessageOrigin` treats `*` as allow-any | `PH-11/screenshots/orbit-fixed.png`, `acceptance-gates-20261022.txt` |
| Amiga smoke failed saveState capability | Early `getState()` probe (added for BluemsX) demoted stock `puae` during AROS boot | Restrict early probe to independently rebuilt cores | `PH-11/amiga-fix-20261022.txt`, regression suite |

---

## Tests executed (this session)

| Suite | Result | Evidence |
| --- | --- | --- |
| `python manage.py test tests` (43) | OK | `PH-11/django-tests-20261022.txt` |
| `verify_storage` | PASS | `PH-11/verify-storage-20261022.txt` |
| `check --deploy` with engineering on / debug off | ERROR `catalog.E001` (expected) | `PH-11/catalog-e001-20261022.txt` |
| `check --deploy` engineering off / debug off | clean | `PH-11/deploy-check-eng-off-20261022.txt` |
| `npm test` (21) | OK | `PH-11/npm-test-20261022.txt` |
| `npm run typecheck` | OK | `PH-11/typecheck-20261022.txt` |
| `acceptance-gates.cjs` | PASS | `PH-11/acceptance-gates-20261022.txt` |
| Emulator regression (Genesis/SMS/GG/NES/PS1/PSP/DOS + family) | PASS | `PH-11/emulator-regression-20261022.txt` |
| Core lock | PASS | `PH-11/core-lock-20261022.txt` |

Prior evidence retained where unchanged: PH-01…PH-08, PH-06 local HTTPS, download faults, offline PWA, Android physical.

---

## Acceptance inventory (mandatory P0 IDs)

| ID | Status | Notes |
| --- | --- | --- |
| API-001…API-004 | PASS | Django + Compose |
| CAT-001, CAT-002 | PASS | Catalog + empty/error/offline UX |
| DL-001…DL-013 | PASS (scoped) | Prior PH-03; not re-run full 1 GiB this session |
| OFF-001…OFF-005 | PASS | Prior PH-02; Orbit player path re-validated |
| EMU-001…EMU-006 | PASS (scoped) | Regression suite 2026-10-22 |
| CMP-001, CMP-002 | PASS (unit) | vitest |
| IN-001, IN-003…IN-005 | PASS | Automated + Android physical |
| IN-002 (simulated) | PASS | Simulated only |
| IN-002-P, IN-002-D | **BLOCKED_EXTERNAL** | No gamepad |
| SAV-001…SAV-003 | PASS | Automated |
| SEC-001…SEC-004 | PASS | Reconfirmed E001 + isolation |
| UX-001, UX-002 | PASS (scoped) | Prior + Android |
| DEP-001, DEP-002 | PASS | Compose healthy |
| IOS-001 | **BLOCKED_EXTERNAL** | No iOS device |
| Staging HTTPS | **BLOCKED_EXTERNAL** | No staging access |
| Product approval | **NOT_VERIFIED** | Human decision required |

Gate table G01–G05 PASS (scoped); G06–G11 PARTIAL (gamepad/iOS/staging open).

---

## Product approval

Live DB re-checked 2026-10-22 after PH-11 (`PH-11/external-gates-availability-20261022.txt`):

| Metric | Count |
| --- | --- |
| Published engineering titles | 42 |
| `product_approval_status=pending` | 42 |
| `approved` | 0 |
| `rejected` | 0 |

**No product approvals were applied by automation.**  
Owner shortlist (proposed public v1 / hold / reject-experimental): `docs/product-release-shortlist-20261022.md`.  
Packets: `docs/catalog-product-approval-report-20261021.md`.

## External gates follow-up (same day, post PH-11)

| Gate | Result | Evidence |
| --- | --- | --- |
| IN-002-P / IN-002-D | **BLOCKED_EXTERNAL** | No `/dev/input/js*`; no gamepad HID (`external-gates-availability-20261022.txt`) |
| IOS-001 | **BLOCKED_EXTERNAL** | `idevice_id -l` empty; no adb device |
| Staging HTTPS | **BLOCKED_EXTERNAL** | No authorized staging access; local HTTPS not substituted |
| Product approval | **NOT_VERIFIED** | Shortlist ready; human Admin decision required |

---

## Security findings (focused release review)

| Finding | Severity | Disposition |
| --- | --- | --- |
| CSP `frame-src` missing `blob:` broke HTML5 | High (availability) | Fixed |
| FrameAdapter `*` origin sentinel bug | High (availability) | Fixed + unit test |
| `catalog.E001` deploy guard | Control verified | PASS |
| Presigned URL TTL after revoke | Accepted limitation | Documented (≤900 s default) |
| Local `check --deploy` with DEBUG=true | Expected warnings | Staging must use DEBUG=false |

No claim of full pentest PASS.

---

## Operational risks

- Tagging COMPLETE while IN-002/IOS-001/staging open would violate PDR.
- Publishing all 42 pending titles would expose diagnostics/EXPERIMENTAL fixtures.
- Web image must be rebuilt after `next.config.mjs` / `frame-adapter` / `public/runtime` changes.
- PSP process RSS can be large during smoke — monitor staging memory limits.

---

## Final release recommendation

1. Merge/commit defect fixes and handover docs.
2. Complete physical gamepad + iOS + staging HTTPS with dated evidence **or** obtain explicit PDR scope change.
3. Human product-approve only intended public titles via `catalog.approve_game_product`.
4. Only then tag a release from a clean committed SHA with matching evidence.

**Do not push, tag, or deploy production without authorization.**
