# Release manager handover

Audience: product owner, ops, QA. No prior session knowledge required.

**Current verdict:** RELEASE CANDIDATE / **NOT COMPLETE** — see `docs/release-acceptance-report.md`.

---

## What “complete” requires

Every mandatory P0 gate PASS (or an **authorized** PDR change removing/altering the gate). Present blockers:

| ID | Why blocked | Role | Action |
| --- | --- | --- | --- |
| IN-002-P / IN-002-D | No physical gamepad on build host | QA | Follow `docs/physical-device-acceptance.md` |
| IOS-001 | No iOS device | QA | Same doc, iOS section |
| Staging HTTPS | No staging DNS/TLS access | Ops | `docs/production-staging-verification.md` |
| Product approval | 42 pending / 0 approved | Product owner | Admin + `catalog.approve_game_product` |

---

## Quick health (local Compose)

```bash
./scripts/compose.sh ps
curl -sI -H 'Host: launcher.localhost' http://127.0.0.1:13000/ | head
./scripts/compose.sh exec -T api python manage.py verify_storage
./scripts/compose.sh exec -T api python manage.py test tests -v 1
python3 scripts/verify-core-lock.py
```

Staging smoke (after access granted): use staging URLs; never production. Commands pattern in `docs/production-staging-verification.md`.

---

## Release checklist (before tag)

- [ ] Git working tree clean; SHA recorded in acceptance report
- [ ] `CORE_LOCK_OK` matches committed `docs/core-package-lock.json`
- [ ] Django tests green; `check --deploy` clean on staging settings
- [ ] `CATALOG_ALLOW_ENGINEERING` false/unset in staging/prod
- [ ] No unintended `CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION=true`
- [ ] Acceptance gates + representative emulator smoke green (or justified reuse)
- [ ] IN-002-P/D evidence dated **or** PDR waiver filed
- [ ] IOS-001 evidence dated **or** PDR waiver filed
- [ ] Staging HTTPS PRODUCTION_STAGING_VERIFIED **or** PDR waiver filed
- [ ] Product-approved title set intentional (diagnostics left pending/rejected)
- [ ] Rollback image/tag identified

---

## Product approval steps

1. Grant `catalog.approve_game_product` only to designated humans (do not invent accounts in automation).
2. For each candidate: review license, SHA-256, PH-05/PH-06 evidence, class (gameplay vs diagnostic).
3. Admin → Approve / Reject / Clear — confirm `ProductApprovalDecision` history row.
4. Expect: API/gateway hide immediately on revoke; direct S3 URLs may live until TTL (default 900 s); offline OPFS copies are **not** remotely wiped.

Inventory snapshot 2026-10-22: **42 pending, 0 approved** — `docs/test-evidence/PH-11/product-approval-counts-20261022.txt`.  
Packets: `docs/catalog-product-approval-report-20261021.md` (update counts when approving).

**Do not** product-approve EXPERIMENTAL platforms (Jaguar, ZX81, N64) without new playability evidence.

---

## Staging smoke test commands (template)

```bash
# After staging deploy of SHA <COMMIT>
curl -fsSI https://<launcher-host>/ | grep -i content-security
# Expect frame-src includes blob: and https://<j2me-host>
./scripts/compose.sh exec -T api env DJANGO_DEBUG=false CATALOG_ALLOW_ENGINEERING=false \
  python manage.py check --deploy
# Browser: install one product-approved title, offline cold-start, Genesis + PSP COI check
```

---

## Rollback checklist

1. Redeploy previous known-good image/tag.
2. Confirm health endpoints.
3. If bad migration: follow forward-fix or tested reverse migration only.
4. If bad catalog approval: Clear/Reject via Admin (permission required).
5. Communicate S3 URL TTL window to support.

---

## Post-deployment verification

| Check | Pass signal |
| --- | --- |
| Catalog | Only product-approved (engineering off) |
| Orbit / HTML5 | Plays (CSP `blob:` + FrameAdapter origin sentinel) |
| Genesis | Interactive + save |
| PSP | Requires COI; otherwise unsupported messaging |
| J2ME | Dedicated origin offline |
| Monitoring | Error rate / restart policy within ops norms |

---

## Known unsupported / experimental (non-P0)

| Item | Status |
| --- | --- |
| ZX81, Jaguar, N64 | EXPERIMENTAL |
| FBNeo | BLOCKED_FIXTURE |
| Atari ST (hatari) | BLOCKED_CORE |
| Sega 32X | BLOCKED_LEGAL |
| Sega CD | BIOS-blocked |
| Commercial J2ME | Unsupported |

Tracker: `docs/platform-expansion-master-plan.md`, `docs/EMULATOR_SUPPORT_MATRIX.md`.

---

## Document map

| Doc | Purpose |
| --- | --- |
| `docs/RELEASE_CANDIDATE.md` | RC checkpoint |
| `docs/release-acceptance-report.md` | This audit’s evidence + verdict |
| `docs/acceptance-matrix.md` | PDR ID statuses |
| `docs/physical-device-acceptance.md` | Gamepad + iOS runbook |
| `docs/production-staging-verification.md` | Staging HTTPS runbook |
| `docs/EXECUTION_STATE.md` | Live agent/ops snapshot |
| `docs/final-handover.md` | Earlier implementation handover (still valid context) |
| `docs/test-evidence/PH-11/` | 2026-10-22 verification artifacts |
