# Product human-review summary (PH-14 handoff)

**Queue:** `product-approval-queue.json`  
**Totals:** 53 pending · **0 approved** · **0 rejected**  
**Rule:** Emulator `VERIFIED_PLAYABLE` ≠ product approval. No bulk auto-approve.

## Workflow (already implemented)

| Control | Behavior |
|---|---|
| `publish()` | Engineering only; leaves `product_approval_status=pending` |
| `approve_for_product` | Requires `catalog.approve_game_product`; append-only `ProductApprovalDecision` |
| Production visibility | Non-approved hidden when `CATALOG_ALLOW_ENGINEERING` is false (`catalog.E001`) |
| Admin | Selected approve/reject/clear — still human-gated |

## Review findings (export scan)

| Check | Result |
|---|---|
| Titles lacking any `license_evidence` row | **0** (seeded fixtures carry evidence objects) |
| Reviewer checklist still `PENDING_HUMAN` | **53 / 53** |
| Public catalog eligible (`approved` + eng ready) | **0** |
| `public-catalog-slugs.json` | **Absent** (only `.example`) → gate stays PENDING |

## Owner must verify per title before approve

1. Copyright / redistribution authorization  
2. Game license text  
3. Artwork rights  
4. Sound / music rights  
5. Firmware path (no proprietary BIOS bundled)  
6. Required core is not LOCAL_ONLY / NOT_CLEARED for the intended public surface  
7. Provenance URL + SHA intact  

Incomplete provenance → **reject** or leave pending (do not approve).

## Public declaration

After approvals, write `public-catalog-slugs.json` listing **only** approved slugs.  
`check-public-release-go.py` fails closed if that file is missing or lists unapproved slugs.
