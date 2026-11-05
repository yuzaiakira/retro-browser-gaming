# Main push safety audit (GitHub source publication)

**Date:** 2026-11-05  
**Branch:** `main`  
**Audited tip:** `12a614b29a61f01055e49ce4608463a664c0d28e`  
**Ahead of `origin/main`:** 79 commits  
**Auditor commands evidence:** `.runtime/test-evidence/main-push-audit/`

## Verdicts (independent)

| Gate | Status |
|---|---|
| **GITHUB_SOURCE_PUSH_READY** (publish *this* reachable history as a public GitHub source tree) | **NOT_CLEARED** |
| Tip-tree private-core hygiene (`PRIVATE_CORE_TRACKED_OK` / SOURCE_ONLY lock) | **PASS** |
| `.gitignore` / future-commit guards for cores & evidence | **PASS** (sufficient for tip; does not rewrite history) |
| **PUBLIC_RELEASE_GO** | **STOP** (unchanged; exit 1) |

GitHub **source** publication ≠ public **product** release. Passing tip hygiene does **not** clear product, counsel, physical, or recipient source-delivery gates.

## 1. Expected PH lineage on main

| Commit | Present on `main`? |
|---|---|
| `318832d` (PH-12 CHD closeout) | YES |
| `8a70f45` (PH-13 RC pack) | YES |
| `ad562fd` (PH-14 blockers) | YES |
| `b53e66d` (external handoff) | YES |
| `d650bf4` (feat→main merge) | YES |
| `bc68351` / `12a614b` (integration docs) | YES |

## 2. Tip tree findings (current files)

| Check | Result |
|---|---|
| Tracked `cores/**/*.wasm` / `*.data` | **None** |
| Flycast LOCAL_ONLY packs | Untracked (private asset root) |
| MAME `rbg_arcade.wasm` | Untracked |
| MAME `rbg_arcade.js` / `.html` | **Tracked** (LOCAL_ONLY browser class; JS glue for engineering — not a tip binary leak) |
| `81_eo` / `virtualjaguar_js` wasm | Untracked |
| Proprietary BIOS | Not tracked |
| Commercial ROMs | Not found |
| Secrets (high-confidence) | No real keys/certs; see false positives below |
| Tip files > 5 MiB | **None** |
| Git LFS | Not configured / not used |
| `infra/docker/empty-proxy-ca.pem` | **0 bytes** placeholder (safe) |
| Legal MIT/GPL fixtures (`.rom`, `.chd` tracks, etc.) | Tracked with provenance/licenses — engineering fixtures, not commercial dumps |

### Secret-pattern false positives (not credentials)

| Location | Match | Assessment |
|---|---|---|
| `apps/api/tests/test_catalog.py` | Django test `password="sample-test-password-*"` | Test-only placeholders |
| `apps/web/public/cores/ejs-4.2.3/src/emulator.js` | UI label `"Password: "` / object field | Upstream EmulatorJS UI — not a secret |

`.env.example` is tracked (template only). Live `.env` is gitignored.

## 3. Historical blob findings (reachable from `main`)

`python3 scripts/check-public-source-safety.py --expect-history-clean` → **FAIL** (exit 1).

| Class | Status | Notes |
|---|---|---|
| Emulator `.wasm` / `.data` from `history-removal-manifest.txt` | **Still reachable** | ≥60 path hits; e.g. last touching commit sample `edcff9c` (“move emulator payloads to private asset root”) removed them from the tip but **blobs remain in history** |
| Largest reachable blobs | Multi‑MiB core packs | e.g. `ppsspp-thread-wasm.data` ~4.4 MiB, `puae-*.data` ~4.0 MiB, BlueMSX packs ~3.9 MiB (object list under evidence) |
| `docs/test-evidence/` Chromium profiles / caches | **Still reachable** | ~773 blobs / ~33 MiB still in history; tip ignores `docs/test-evidence/` |
| LOCAL_ONLY Flycast/MAME **wasm** in tip | Absent | Historical presence of stock EJS/jsdos binaries is the primary history issue |

### Exact remediation (do **not** auto-execute)

1. **Do not** force-push or rewrite `origin/main` / private history without a separate owner-approved Option A/B plan.  
2. For **public** GitHub source publication: rebuild a **sanitized candidate** with `git filter-repo` (or equivalent) using `docs/open-source/history-removal-manifest.txt` + removal of historical `docs/test-evidence/` objects — existing Option B flow (`scripts/build-sanitized-candidate.sh`, `docs/open-source/FINAL-PUBLICATION-CHECKLIST.md`).  
3. Re-run on the **candidate** only:  
   `python3 scripts/check-public-source-safety.py --expect-history-clean` → must PASS.  
4. Preserve private backups / this private `main` tip; publish only the sanitized tree to a **new** public repo (do not flip private repo visibility).  
5. Keep LOCAL_ONLY / NOT_CLEARED classifications; never copy private-runtime binaries into the public tree.

## 4. `.gitignore` / future-commit sufficiency

Present and adequate for **new** commits:

- `.private-runtime/`  
- `apps/web/public/cores/**/*.data` / `*.wasm`  
- `docs/test-evidence/` / `.runtime/`  
- `.env`, asset backups, source-offer assemblies, large CDI disc builds  

**Limit:** ignore rules do not purge historical blobs. Tip hygiene PASS ≠ history clean.

## 5. GPL / LGPL / source redistribution

| Topic | Status |
|---|---|
| Corresponding-source matrix / allowlist | Present; 72 AUTHORIZED + 4 LOCAL_ONLY + 5 NOT_CLEARED |
| Source-offer **package** build | PASS (prior); recipient HTTPS **NOT_VERIFIED** |
| Counsel / `NEEDS_LEGAL_REVIEW` | **PENDING** — license names ≠ approval |
| LOCAL_ONLY (Flycast, MAME rbgdot) | Must not ship on public CDN; source packaging for counsel remains separate |
| `81_eo` / `virtualjaguar_js` | **BLOCKED_LEGAL** for public browser distribution |
| Publishing sanitized **application source** | Allowed only after history purge + owner Option B authorization; does not satisfy product release |

## 6. Existing checks run (this session)

| Command | Result |
|---|---|
| `check-public-source-safety.py` (private tip) | PASS with history **notes** |
| `check-public-source-safety.py --expect-history-clean` | **FAIL** |
| `check-no-private-cores-tracked.py` | `PRIVATE_CORE_TRACKED_OK` |
| `verify-core-lock.py --mode SOURCE_ONLY` | PASS (327 checked / 70 skipped binaries) |
| `check-public-release-go.py` | **PUBLIC_RELEASE_GO=STOP** exit 1 |

## 7. Preserved external blockers (unchanged)

B-SRC-01, B-LEG-01, B-CAT-01, B-STG-01, B-AND-01, B-IOS-01, B-PAD-01, B-DIST-01, B-BIOS-01 — see `blocker-registry.md`. Catalog still 0 approved; counsel decisions absent; physical **BLOCKED_EXTERNAL**.

## 8. Push authorization posture

| Action | Allowed by this audit? |
|---|---|
| Push **current** `main` history to a **public** GitHub repo | **NO** — `GITHUB_SOURCE_PUSH_READY=NOT_CLEARED` |
| Flip private repo to public | **NO** |
| Force-push / automatic history rewrite | **NO** |
| Public product deploy / CDN | **NO** — `PUBLIC_RELEASE_GO=STOP` |
| Owner-authorized push of tip to **existing private** `origin` | Outside this gate; still requires explicit push authorization (not granted here) |
| After sanitized candidate + `--expect-history-clean` PASS + owner Option B auth | May become READY — re-audit then |

## Remaining blockers for GitHub **source** publication

1. Historical private emulator binaries still reachable from `main`.  
2. Historical `docs/test-evidence/` browser profiles/caches still reachable (~33 MiB).  
3. Counsel / corresponding-source legal clearance still pending (separate from tip hygiene).  
4. Owner authorization for Option B public repo creation still required.

**GITHUB_SOURCE_PUSH_READY = NOT_CLEARED**  
**PUBLIC_RELEASE_GO = STOP**
