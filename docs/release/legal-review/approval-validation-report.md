# Approval validation report (PH-20)

**Generated:** 2026-11-05 (workflow tooling commit)  
**Private tip (pre-commit):** `b7a8587` lineage  
**Policy:** Fail-closed. No forged owner/counsel decisions. Synthetic test identities are fixture-only.

## Counts

| Metric | Value |
|---|---|
| Attestation groups (OA-*) | **18** |
| First-party attestation-track files | **146** |
| Counsel decision groups (CD-RG-*) | **52** |
| Independent legal questions | **65** |
| Unresolved legal uncertainty flags | **3** |
| Actual human approvals received | **0** owner / **0** counsel |
| Auto-approvals | **0** |

### Unresolved legal flags (preserved)

1. `.fixtures/fds-dreamful-diskmag.README.md` — LicenseRef-Noncommercial-Shareware  
2. `.fixtures/fds-dreamful-diskmag.fds` — same  
3. `.fixtures/mit-jaguar-2048.bin` — MIT derivation/redistribution question vs inventoried `.jag`

## Validation test results

Command: `python3 scripts/test_human_approvals.py -v` → **15 passed**

| Scenario | Result |
|---|---|
| Missing decision | OK — incomplete, not forged |
| Invalid reviewer authority | REJECT |
| Missing authorized roster with approvals | REJECT |
| Incorrect file scope / partial members | REJECT |
| Wrong artifact / policy tree version | REJECT |
| Conflicting decisions | REJECT |
| Expired approval | REJECT |
| Revoked approval | REJECT |
| Partial group approval | Incomplete (fail-closed) |
| Restricted Flycast path counsel-approved | REJECT |
| Tampered scope hash | REJECT |
| Unrelated approval inheritance | Not inherited |
| `clears_product_restriction=true` | REJECT |
| Missing evidence refs on positive | REJECT |
| Live repo zero human approvals | OK |

Live validator: `python3 scripts/validate-human-approvals.py` → `HUMAN_APPROVALS_OK INCOMPLETE` (`owner_attested=0/18`, `counsel_approved=0/52`).

## Gate results (expected)

| Gate | Result |
|---|---|
| Provenance inventory | `PROVENANCE_INVENTORY_OK` nlr=562 gaps=3 groups=52 auto_approved=0 |
| Public source safety | `PUBLIC_SOURCE_SAFETY_PASS` (history notes expected on private tip) |
| `PUBLIC_SOURCE_MIRROR_READY` | **NOT_CLEARED** (NLR=562 + counsel absent + human approvals incomplete 18/52) |
| `GITHUB_SOURCE_PUSH_READY` | **NOT_CLEARED** |
| `PUBLIC_RELEASE_GO` | **STOP** |

## Remaining blockers

- B-OWN-01 — 18 OA groups unsigned (146 files)
- B-LEG-02 / B-MIR-01 — 52 CD groups without counsel decisions; 3 unresolved flags
- B-LEG-01 — legacy pack `counsel-decisions.json` still absent (81 CS-* rows)
- Product catalog approvals pending; LOCAL_ONLY / BLOCKED_* preserved
- Source delivery / physical / staging external blockers unchanged

## Artifacts added

- Manifests: `owner-attestation-manifests.json`, `counsel-decision-manifests.json`
- Examples/schema: `authorized-reviewers.json.example`, `owner-attestations.json.example`, updated `counsel-decisions.json.example`, `counsel-decisions.schema.json`
- Templates/workflow: `owner-attestation-template.md`, `counsel-decision-template.md`, `human-approval-workflow.md`
- Tooling: `scripts/build-human-approval-manifests.py`, `scripts/validate-human-approvals.py`, `scripts/test_human_approvals.py`
- Gate: `check-public-source-mirror-ready.py` requires validated complete human approvals
