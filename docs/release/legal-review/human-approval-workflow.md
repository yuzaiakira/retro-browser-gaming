# Human approval workflow (PH-20)

Fail-closed workflow for **real** owner attestations and counsel decisions. Automation prepares manifests and validates records; it never signs, forges, or auto-approves.

## Distinctions

| Status | Meaning |
|---|---|
| `OWNER_ATTESTED` | Authorized owner attested exact OA-* first-party scope |
| `COUNSEL_APPROVED` | Authorized counsel cleared exact CD-* tip-file scope for SOURCE |
| `NEEDS_REVIEW` | Default / incomplete |
| `REJECTED` / `WITHHOLD` | Explicit negative |
| `EXPIRED` / `REVOKED` | No longer valid |
| `OUT_OF_SCOPE` | Explicitly not claimed by this reviewer |

Owner attestation ≠ counsel approval. Public SOURCE mirror clearance ≠ public product release.

## Artifacts

| Artifact | Role |
|---|---|
| `owner-attestation-manifests.json` | Exact OA-* file scopes (generated) |
| `counsel-decision-manifests.json` | Exact CD-RG-* scopes + unresolved flags (generated) |
| `authorized-reviewers.json.example` → `.json` | Live authority roster (human-maintained) |
| `owner-attestations.json.example` → `.json` | Live owner decisions |
| `counsel-decisions.json.example` → `.json` | Live counsel decisions (+ legacy CS-* pack rows) |
| `counsel-decisions.schema.json` | Schema for counsel records |
| `scripts/build-human-approval-manifests.py` | Rebuild manifests from provenance |
| `scripts/validate-human-approvals.py` | Validate decisions (no fabrication) |
| `scripts/check-public-source-mirror-ready.py` | Gate requires complete validated approvals |

## Process

1. Ensure PH-18/19 packs current: `file-provenance.json`, `review-groups.json`, `unresolved-provenance.json`.
2. Run `python3 scripts/build-human-approval-manifests.py`.
3. Owner reviews `owner-decision-checklist.md` + OA manifests; fills `owner-attestations.json` using the owner template.
4. Counsel reviews `counsel-review-pack.md` + CD manifests; fills `counsel-decisions.json` using the counsel template / schema.
5. Maintain `authorized-reviewers.json` with independent authorization evidence (not Git authors).
6. Run `python3 scripts/validate-human-approvals.py` — fix errors; incompleteness is expected until all groups are decided.
7. Re-run `python3 scripts/check-public-source-mirror-ready.py` — remains **NOT_CLEARED** until approvals are complete **and** other mirror checks pass.
8. `PUBLIC_RELEASE_GO` stays independent and **STOP** until product/device/delivery gates also pass.

## Validation rejects

- Missing / unauthorized `reviewer_id`
- Scope hash or member-list mismatch (wrong / partial / tampered scope)
- Wrong `compatible_policy_tree_sha` (stale vs policy)
- Conflicting positive vs negative decisions for the same id
- Expired or revoked positives
- `clears_product_restriction=true`
- Restricted Flycast tip paths in a positive counsel scope
- Cross-group inheritance (approving CD-A never clears CD-B)

## Preserved product restrictions

Regardless of SOURCE counsel:

- Flycast, MAME → **LOCAL_ONLY**
- `81_eo`, Jaguar → **BLOCKED_LEGAL**
- ColecoVision, Vectrex → **BLOCKED_EXTERNAL**
- Catalog product approvals → pending until product owners decide

## Audit trail

- Manifests pin `scope_sha256` over sorted paths.
- Decision rows must cite evidence refs and timestamps.
- Synthetic test identities exist only under `scripts/test_human_approvals.py` temp fixtures — never in live approval JSON.
