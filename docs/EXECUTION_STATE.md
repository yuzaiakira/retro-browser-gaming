# Execution state

## Verdict

**RELEASE CANDIDATE / NOT COMPLETE** (product/device/staging gates unchanged).  
**Open-source prep:** **PUBLIC_BROWSER hardened** — Compose/image default `PUBLIC_BROWSER`; LOCAL_FULL opt-in only; fail-closed sync + middleware allowlist-only; CS gate levels separated. Sanitized candidate `6d46176` (private `53567d2`); **STOP** before GitHub publish / root LICENSE / counsel auto-approval.

## Deferred physical / external (do not rediscover)

- IN-002-P / IN-002-D — no gamepad (`docs/physical-device-acceptance.md`)
- IOS-001 — no iOS device (same)
- Staging HTTPS — no authorized staging (`docs/production-staging-verification.md`)

## Platform / catalog status

| Item | Status |
|---|---|
| VERIFIED_PLAYABLE | Prior set + Amiga + CPC + NDS + MSX (save/restore verified) |
| EXPERIMENTAL | ZX81 / Jaguar / N64 |
| FBNeo | BLOCKED_FIXTURE |
| Atari ST | BLOCKED_CORE — hatari absent |
| Core lock | **373 files** |
| Tracker | `docs/platform-expansion-master-plan.md` |

## Harden pass (2026-10-26)

| Check | Result | Evidence |
|---|---|---|
| Fail-closed sync unit | OK (6) | `scripts/test_sync_fail_closed.py` |
| Allowlist unit | OK (4) | `scripts/test_browser_allowlist.py` |
| LOCAL_FULL→PUBLIC purge | `removed_public=5` | `docs/open-source/local-full-to-public-purge-20261026.txt` |
| Anonymous HTTP PUBLIC | genesis/bluemsx 200; 81_eo/vj_js/unknown 404 | `docs/open-source/anonymous-core-access-failclosed-20261026.txt` |
| Missing private dir | FAIL closed | `docs/open-source/missing-private-dir-fail-20261026.txt` |
| Corrupt allowlist | FAIL closed | `docs/open-source/corrupt-allowlist-fail-20261026.txt` |
| Source-offer levels | META=55 ARCHIVE=55 DELIVERY=0 LEGAL_REVIEW=59 | gate stdout |
| SOURCE_ONLY lock | OK skipped 59 | `docs/open-source/source-only-lock-20261026.txt` |
| Django 43 | OK | `docs/open-source/django-tests-harden-20261026.txt` |
| Vitest 21 / typecheck | OK | `docs/open-source/*harden-20261026.txt` |
| Acceptance gates | PASS | `docs/open-source/acceptance-gates-harden-20261026.txt` |
| Genesis / MSX / Orbit | PASS | genesis-core-smoke / msx-smoke / acceptance+smoke |
| Portable backup verify | 59 OK | `docs/open-source/portable-backup-verify-harden-20261026.txt` |
| Compose default | PUBLIC_BROWSER | `compose.yaml` + `docs/open-source/provision-mode-defaults.md` |
| Local override | LOCAL_FULL opt-in (gitignored) | `compose.override.example.yaml` |

## Exact commands

```bash
python3 scripts/test_sync_fail_closed.py
python3 scripts/test_browser_allowlist.py
python3 scripts/check-source-offer-gate.py
RBG_CORE_PROVISION_MODE=PUBLIC_BROWSER ./scripts/compose.sh up -d --force-recreate web
# HTTP evidence via Host: launcher.localhost on edge port

python3 scripts/verify-core-lock.py --mode SOURCE_ONLY
./scripts/compose.sh exec -T api python manage.py test tests -v 1
```

## Open-source private assets (2026-10-26)

| Item | Status |
|---|---|
| Private root | `.private-runtime/cores/` (gitignored); env `RBG_PRIVATE_ASSET_DIR` |
| Binaries untracked | 59 `.data`/`.wasm` |
| Immutable OS migration backup | `/home/akira/Projects/git-contribute/retro-browser-gaming-os-backup-20261026/` (**do not modify**) |
| Portable asset backup | `/home/akira/Projects/git-contribute/RetroBrowserGaming-Asset-Backup-20261026/` (59 files, verified) |
| History dry-run | PASS in disposable clone — **STOP** before rewriting owner repo / origin |

## Remaining blockers / next

1. **Owner:** choose root LICENSE (`docs/open-source/license-decision-sheet.md`)
2. **Owner:** authorize Option B new public repo push (`docs/open-source/option-b-publication-steps.md`) — keep private origin intact
3. **Counsel:** review `docs/open-source/legal-review-package.md` — `NEEDS_LEGAL_REVIEW` ≠ approval
4. **Owner:** publish corresponding-source offer URL, then set `RBG_SOURCE_OFFER_PUBLIC_URL` (until then `OFFER_DELIVERY_VERIFIED=0`)
5. Product: approve minimal Alpha set (`docs/open-source/public-alpha-game-set.md`) — none auto-approved
6. Resolve CS for `81_eo` / `virtualjaguar_js` before any browser authorization
7. QA: physical gamepad + iOS; Ops: staging HTTPS
8. Do **not** tag COMPLETE; do **not** reopen emulator expansion for P0
9. Store a second verified portable backup on independent media
