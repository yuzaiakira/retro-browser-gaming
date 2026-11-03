# Catalog product approval matrix (PH-13)

**Frozen HEAD:** `318832d`  
**Machine-readable:** `docs/release/product-approval-matrix.json`  
**Dump evidence:** `.runtime/test-evidence/PH-13/catalog-approval-dump.txt`

## Summary

| Metric | Value |
|---|---|
| Seeded / published catalog titles audited | **53** |
| `product_approval_status=pending` | **53** |
| Owner-approved for public distribution | **0** |
| Rejected | **0** |

**CATALOG_PRODUCT_APPROVED:** **PENDING_APPROVAL**

## Classification rules

| Class | Definition | Public candidate? |
|---|---|---|
| Engineering fixture | Seeded MIT/GPL demo for harnesses | **No** until owner approval |
| Publicly distributable game | Cleared copyright + artwork + sound + firmware path | Only after explicit owner record |
| Private imported game | Operator-local import | Never auto-public |
| Product-approved game | Owner signed approval fields | Eligible for public candidate **if** cores also cleared |

First-party / MIT fixtures are **not** auto-approved.

## Per-title verification checklist (owner review)

For every slug, owner/counsel must confirm before flipping approval:

1. Copyright ownership or redistributable authorization  
2. License text / provenance  
3. Artwork rights  
4. Sound / music rights  
5. Firmware / BIOS requirements (none proprietary bundled)  
6. Core distribution status (`PUBLIC_CANDIDATE` vs `PRIVATE_ONLY` / blocked)  
7. Source provenance (fixture SHA + upstream URL)  
8. Redistributable binary status of required cores  

Until then: **keep every title hidden from any future public distribution candidate** (catalog already gates on `product_approval_status`; deploy path `catalog.E001` remains the fail-closed check).

## Current inventory (all PENDING)

Full slug list: `product-approval-matrix.json` and `.runtime/test-evidence/PH-13/pending-product-slugs.txt` (53 lines).

Representative engineering fixtures (non-exhaustive): Orbit HTML5, Genesis/SMS/GG MIT demos, Dreamcast Dot ELF/GDI/CDI/CHD, Arcade `rbgdot`, Flash Dot SWF, FDS move-demo, Atari ST Pong Wars, Atari8 Dot, ZX81 Dot, N64 USB64 test, etc. — **all** `pending`.

## Owner action required

Record approvals (or rejections) in the catalog product-approval fields with actor + timestamp. Do not treat engineering `VERIFIED_PLAYABLE` as product clearance.
