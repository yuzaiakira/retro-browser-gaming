# Counsel decision template (PH-20)

**Status:** Template only — automation never fabricates counsel decisions.  
**Schema:** `counsel-decisions.schema.json` · example: `counsel-decisions.json.example`

## Rules

1. Require authorized counsel (`authorized-reviewers.json`, role=`counsel`, `active=true`).
2. Decide **one** `CD-RG-NNN` (or legacy `CS-NNNN` pack row) at a time — no inheritance across groups.
3. Exact membership = manifest `members` / `scope_sha256`. Partial approval ≠ group clearance.
4. Preserve product restrictions: Flycast & MAME **LOCAL_ONLY**; `81_eo` & Jaguar **BLOCKED_LEGAL**; ColecoVision & Vectrex **BLOCKED_EXTERNAL**. Set `clears_product_restriction` to **false** (or omit).
5. SOURCE mirror counsel ≠ public product-release authorization.
6. Residual legal flags in `unresolved-provenance.json` remain open until the owning `CD-*` is decided.

## Decision worksheet

| Field | Value |
|---|---|
| Decision id | `CD-DEC-____` |
| Counsel decision id | `CD-RG-___` |
| Review group id | `RG-___` |
| Component | |
| SPDX / license evidence | |
| Member count (from manifest) | |
| Scope SHA-256 | |
| Policy tree SHA | |
| Independent legal questions addressed | (list ids/text) |
| Permitted distribution scope | `PUBLIC_SOURCE_MIRROR` / `PRIVATE_ONLY` / `WITHHOLD` / `UNDECIDED` |
| Conditions / restrictions | |
| Decision | `COUNSEL_APPROVED` / `WITHHOLD` / `REJECTED` / `NEEDS_REVIEW` / `OUT_OF_SCOPE` / `EXPIRED` / `REVOKED` |
| Reviewer id | |
| Decided at | `YYYY-MM-DD` |
| Expires at | optional |
| Evidence refs | pack / notices / memos |
| Clears product restriction? | **false** |
| Revoked? | false |

## Counsel narrative (optional memo attachment)

> Regarding **`[CD-RG-NNN]`** / component **`[name]`**, after reviewing provenance and license evidence referenced below, counsel decides **`[decision]`** for **public SOURCE mirror** distribution of the exact file membership identified by scope hash **`[scope_sha256]`**.  
> Conditions: **`[conditions or none]`**.  
> This decision does **not** authorize product catalog publication, LOCAL_ONLY/BLOCKED runtime redistribution, or unrelated review groups.

## Related

- `counsel-decision-manifests.json` — 52 tip-file groups  
- `counsel-review-pack.md` — human-readable questions  
- `unresolved-provenance.json` — 3 residual legal uncertainty flags  
- `human-approval-workflow.md`  
