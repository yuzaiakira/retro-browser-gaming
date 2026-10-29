# Final publication checklist — public SOURCE candidate

**Date:** 2026-10-29  
**STOP:** Do not create a public GitHub repository, change private visibility, force-push, tag, or upload private assets until the owner explicitly authorizes publication.

Identity SHAs below are filled after the documentation commit lands and the Option B1 candidate is rebuilt from that tip. Confirm with:

- Private: `git rev-parse HEAD`
- Candidate: `CANDIDATE_HEAD.txt` from `./scripts/build-sanitized-candidate.sh` (stamp `20261029-final`)

## Identity (fill at close)

| Item | Value |
|---|---|
| Synchronized private HEAD (pre-doc tip) | `5d494346f94b39f3ecff31da6465edb7321dc82e` (= `origin/main`) |
| Private HEAD after this checklist commit | `986ecaa1bab82986fcff0f9c39050add8856b56d` |
| Sanitized candidate HEAD | `cb6a88b651215cbb43d38ab2b129589f615946c3` |
| Preserved commits (candidate) | 138 (not squashed) |
| Private history rewritten? | **No** |
| Pushed / published? | **No** |

Stale candidates (`3ea444d…`, `061aba7…`, `eb35bf7…`, `20261028-*`) must **not** be published.

## PUBLIC_SOURCE_READY gates

| Gate | Status |
|---|---|
| Root MIT `LICENSE` (`Copyright (c) 2026 Akira Yuzai`) | **PASS** (enacted) |
| Root `NOTICE` first-party vs third-party boundary | **PASS** |
| README does not claim entire tree is MIT | **PASS** |
| `first-party-license-scope.md` / `third-party-notices.md` / `LICENSES/` | **PASS** |
| EmulatorJS GPL-3.0 / jsdos GPL-2.0 / js2me MIT retained | **PASS** |
| `81_eo` / `virtualjaguar_js` remain NOT_CLEARED | **PASS** (documented withhold) |
| Docs hygiene (`check-docs-hygiene.py`) | **PASS** |
| No tracked browser profiles / generated evidence | **PASS** |
| History removal manifest (60 paths) absent on candidate | **PASS** |
| `audit-public-history.py --expect-clean` | **PASS** |
| `check-public-source-safety.py --expect-history-clean` (candidate) | **PASS** |
| No private cores tracked / SOURCE_ONLY lock | **PASS** |
| Corresponding-source assemble | **PASS** (`CORRESPONDING_SOURCE_OFFER_OK`; gaps remain) |
| Source-offer gate | **PASS** metadata; **OFFER_DELIVERY_NOT_VERIFIED** |
| Fresh SOURCE_ONLY `--check` + `--no-start` | **PASS** |
| Vitest (fresh candidate clone) | **PASS** (66) |
| TypeScript `--noEmit` (fresh) | **PASS** |
| Django `manage.py test tests` (fresh, sqlite memory) | **PASS** (43) |
| LOCAL_FULL import + provision + `--check` | **PASS** (requires `RBG_ALLOW_LOCAL_FULL=1`) |
| LOCAL_FULL refused without allow flag | **PASS** |
| Genesis `core-smoke.cjs` (LOCAL_FULL disposable) | **PASS** (incl. save/load) |
| Orbit catalog reachability | **PASS** (game page); full canvas play not re-certified this session |
| Provisioned `.data`/`.wasm` not Git-tracked | **PASS** |

## PUBLIC_HOSTED_RELEASE_READY (separate)

| Gate | Status |
|---|---|
| Staging HTTPS certification | **NOT_VERIFIED** |
| Physical gamepad / iOS Safari | **BLOCKED_EXTERNAL** |
| Product catalog / Alpha approvals | Open |
| Live corresponding-source HTTPS offer | **OFFER_DELIVERY_NOT_VERIFIED** |
| Independent counsel approval | **NEEDS_LEGAL_REVIEW** (archive integrity ≠ approval) |

These do **not** automatically block publishing the sanitized **source** repository once the owner authorizes Option B1.

## Backups (retained)

| Backup | Status |
|---|---|
| Tip Git bundle `…-os-backup-20261029/` (+ SSD2 copy) | Verified (`git bundle verify`) |
| Prior `…-os-backup-20261028/` bundles | Retained (not deleted) |
| Private asset backup (SSD2 + local) | Import verified on disposable LOCAL_FULL |

## Exact publication commands (owner authorization required)

Do **not** run until explicitly approved.

```bash
# 1) On private clone: confirm tip and rebuild candidate
git rev-parse HEAD
./scripts/build-sanitized-candidate.sh   # uses isolated disposable clone only

# 2) Re-verify candidate
cd ../retro-browser-gaming-public-candidate-<stamp>/tree
python3 scripts/audit-public-history.py --expect-clean
python3 scripts/check-public-source-safety.py --expect-history-clean
python3 scripts/check-docs-hygiene.py
./scripts/setup.sh --source-only --check

# 3) Create a NEW empty public GitHub repo (never open the private repo)

# 4) Push candidate main only
git remote add public git@github.com:<owner>/<new-public-repo>.git
git push -u public main
```

Forbidden without separate approval: force-push, visibility change on the private repo, uploading `.private-runtime`, BIOS/ROMs, or uncleared core binaries.

## Verdict

| Verdict | Status |
|---|---|
| `PUBLIC_SOURCE_READY` | **PASS** (technical) — owner must still authorize remote publication |
| `PUBLIC_HOSTED_RELEASE_READY` | **NOT_VERIFIED** |
| Publication executed? | **No — STOP** |
