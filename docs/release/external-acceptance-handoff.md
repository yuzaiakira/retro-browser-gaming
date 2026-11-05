# External acceptance handoff

**Development branch:** `main` (integration merge `d650bf4`, includes handoff `b53e66d`)  
**Engineering baseline:** `318832d`  
**PUBLIC_RELEASE_GO:** **STOP**  
**Machine-readable checklist:** `external-acceptance-checklist.json`  
**Integration report:** `main-integration-report.md`

This document is the single external-facing index. Detailed procedures live in linked files — this page does not duplicate full inventories.

## 1. What is ready (internal / private RC)

| Area | Status |
|---|---|
| Engineering gameplay baseline (incl. Dreamcast CHD, soak 10/10 prior) | PASS (preserved) |
| Reproducible core-lock / Compose private stack | PASS |
| Runtime CSP / FrameAdapter security posture | PASS |
| Corresponding-source **package** assemble + mock integrity | PASS (`SOURCE_PACKAGE_BUILT`) |
| HTTPS deploy **templates** for source offer | PASS (template only) |
| Legal review **queue** generated (81 entries) | Ready for counsel (0 approvals) |
| Product approval **workflow + export** (53 pending) | Ready for owner (0 approvals) |
| Fail-closed PUBLIC_BROWSER sync / allowlist tests | PASS |
| Auditable `check-public-release-go.py` | PASS as STOP (fail-closed) |

## 2. What requires external / human action

| ID | Owner | Action |
|---|---|---|
| B-SRC-01 | Ops + Compliance | Authorized HTTPS source-offer host + recipient verification |
| B-LEG-01 | Counsel | Review pack → `counsel-decisions.json` (example only today) |
| B-CAT-01 | Product owner | Per-title approvals + `public-catalog-slugs.json` |
| B-STG-01 | Ops | Staging HTTPS cutover (not LOCAL_HTTPS) |
| B-AND-01 / B-IOS-01 / B-PAD-01 | QA | Physical devices + evidence markers |
| B-DIST-01 | Release | Keep LOCAL_ONLY/BLOCKED out of public; clear only after upstream gates |
| B-BIOS-01 | Legal + QA | Lawful Coleco/Vectrex BIOS or leave blocked |

Full fields (prerequisites, evidence, commands): **`external-acceptance-checklist.json`**.

## 3. What remains blocked

- SOURCE_DELIVERY_READY — recipient HTTPS **NOT_VERIFIED**  
- LEGAL_REVIEW_READY — **PENDING_APPROVAL** (0 counsel clearances)  
- CATALOG_PRODUCT_APPROVED — **PENDING_APPROVAL** (0/53)  
- ANDROID / IOS / gamepad — **BLOCKED_EXTERNAL**  
- PUBLIC_DISTRIBUTION_CLEARED — **FAIL**  
- Staging HTTPS — **BLOCKED_EXTERNAL**  
- ColecoVision / Vectrex interactive — **BLOCKED_EXTERNAL** (BIOS)

## 4. Exact next human actions (ordered)

1. **Counsel:** Review `legal-review/legal-review-pack.csv`; record decisions in `counsel-decisions.json` (see `.example`).  
2. **Ops:** Publish corresponding-source tree from `~/.cache/rbg-source-offer/` to authorized HTTPS; follow recipient procedure below.  
3. **Product:** Approve titles individually in Admin; write `public-catalog-slugs.json` with only approved slugs.  
4. **Ops:** Staging HTTPS acceptance per `staging-https-report.md`.  
5. **QA:** Android then iOS checklists; drop `ANDROID_PHYSICAL_PASS` / `IOS_PHYSICAL_PASS` markers only after real runs.  
6. **Release:** Re-run `python3 scripts/check-public-release-go.py` until it prints `PUBLIC_RELEASE_GO=GO` (today: STOP).

## 5. Source package readiness (inspected)

| Check | Result |
|---|---|
| Deterministic `OFFER_MANIFEST.json` + `SHA256SUMS` | PASS |
| Sample hash verify (50 files) | 0 mismatches |
| Private `.wasm`/`.data`/ROM/CHD in offer | **None found** |
| `binary_bindings` count | 72 AUTHORIZED only |
| LOCAL_ONLY (Flycast/MAME) in bindings | **Excluded** |
| NOT_CLEARED `81_eo` / `virtualjaguar_js` in bindings | **Excluded** |
| Stock `virtualjaguar` (non-`_js`) in AUTHORIZED bindings | Present — counsel must still clear (EXPERIMENTAL gameplay) |
| Nginx template `autoindex off` + `*.wasm`/`*.data` 404 | PASS |
| Recipient HTTPS live verify | **NOT_VERIFIED** |

### External recipient verification procedure

1. Obtain offer URL `https://<authorized-host>/corresponding-source/<git-sha>/`.  
2. Fetch `OFFER_MANIFEST.json`, `README.txt`, `SHA256SUMS`.  
3. Confirm `format=rbg-corresponding-source-offer-v1` and `allowlist_sha256` matches published allowlist.  
4. Download every `SHA256SUMS` path; `sha256sum -c` (or gate fetcher).  
5. Confirm archive contains patches/docs/JS sources — **no** emulator `.wasm`/`.data`, no BIOS/ROM.  
6. Confirm build instructions via `docs-corresponding` / rebuild scripts in the offer.  
7. Operator runs:  
   `RBG_SOURCE_OFFER_PUBLIC_URL=<url> python3 scripts/check-source-offer-gate.py --require-public-delivery`  
8. Only then may SOURCE_DELIVERY_READY be recorded PASS.

Mock/`RBG_SOURCE_OFFER_MOCK_DIR` **never** satisfies this.

## 6. Legal / product handoff summaries

- Counsel: `legal-human-review-summary.md`  
- Product: `product-human-review-summary.md`  

Never treat GPL/MIT labels as approval.

## 7. Physical QA

- Android: `android-physical-test-instructions.md`  
- iOS: `ios-physical-test-instructions.md`  
- Gates remain **BLOCKED_EXTERNAL** without hardware.

## 8. Release safety gate

```bash
python3 scripts/check-public-release-go.py
# Expect today: PUBLIC_RELEASE_GO=STOP (exit 1)
```

Fails closed when: source delivery unverified, counsel file missing/incomplete, public catalog slugs missing/unapproved, physical PASS markers absent, or PUBLIC_BROWSER would leak LOCAL_ONLY/NOT_CLEARED.

## 9. Commit / identity

Record `git rev-parse HEAD` after handoff commits. Do **not** push, merge, or publish without owner authorization.
