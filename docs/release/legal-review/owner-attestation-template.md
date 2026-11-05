# Owner attestation template (PH-20)

**Status:** Template only — do **not** sign this file in-place as automation.  
**Authority:** Real attestations go in `owner-attestations.json` after copying from `.example`, with a live `authorized-reviewers.json` roster.

## Rules

1. Git authorship does **not** prove ownership or redistribution rights.
2. One `OA-*` decision covers **only** the exact `members` list / `scope_sha256` in `owner-attestation-manifests.json`.
3. Blankets with ambiguous scope are invalid.
4. Owner attestation ≠ counsel approval ≠ product catalog approval ≠ public product release.
5. Do not attest paths you do not control; mark `OUT_OF_SCOPE` or leave `NEEDS_REVIEW`.

## Human statement (copy into evidence / ticket)

> I, **[legal name / role]**, am authorized to act for Retro Browser Gaming regarding attestation group **`[OA-NNN]`**.  
> To my knowledge, the listed paths were created for this project or we hold rights to publish them under **`[license]`**.  
> Known third-party notes for this group are listed in the manifest / `file-provenance.json`.  
> Scope hash I reviewed: **`[scope_sha256]`** (policy tree **`[compatible_policy_tree_sha]`**).  
> I understand this does **not** clear third-party counsel review, LOCAL_ONLY/BLOCKED product restrictions, or public product release.

**Attestation group id:** `OA-___`  
**Reviewer id (must exist in authorized-reviewers.json, role=owner, active):** `________`  
**Decision:** `OWNER_ATTESTED` | `NEEDS_REVIEW` | `REJECTED` | `OUT_OF_SCOPE`  
**Decided at (ISO date):** `YYYY-MM-DD`  
**Expires at (optional):** `YYYY-MM-DD`  
**Evidence refs:**  
-  
**Notes:**  

## Machine record shape

See `owner-attestations.json.example`. Required for positive decisions: `reviewer_id`, `decided_at`, `scope_sha256`, `evidence_refs`, matching `compatible_policy_tree_sha`.

## Related

- `owner-attestation-manifests.json` — exact file-scope groups  
- `owner-decision-checklist.md` — unsigned checklist  
- `human-approval-workflow.md` — end-to-end process  
