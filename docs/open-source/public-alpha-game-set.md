# Recommended minimal Public Alpha game set

**Agent role:** recommend only — **no approvals applied**  
**DB probe (2026-10-26 Compose):** 42 published games, **42 pending**, **0 approved**  
**Source shortlist:** `docs/product-release-shortlist-20261022.md` (bucket A = 24)

All 42 shortlist/DB slugs reconcile: every shortlist slug exists in the live DB; DB has no extra playable product candidates beyond the documented shortlist + engineering holds + experimental.

## Minimal Alpha (suggested first approvals)

Prioritize titles with strongest prior gameplay evidence and simple UX:

| Slug | Why |
| --- | --- |
| `orbit-catch` | First-party MIT HTML5; no private WASM required |
| `mit-genesis-breakout` | Genesis smoke repeatedly PASS |
| `mit-genesis-pong` | Genesis smoke |
| `mit-sms-ninjagirl` | SMS verified |
| `mit-nes-table-tennis` | NES verified |
| `mit-snes-gothicvania` | SNES verified |
| `mit-dos-floppybird` | jsdos path |
| `mit-j2me-paddle` | J2ME dedicated-origin path |

**Requires private WASM provision** for all except `orbit-catch`.

## Explicitly exclude from Alpha product catalog

| Slug | Reason |
| --- | --- |
| `mit-jaguar-2048` | EXPERIMENTAL |
| `mit-zx81-dot` | EXPERIMENTAL |
| Dot / hardware-test fixtures (`mit-*-dot`, `gpl-ngp-*`, `huc-pce-scroll`, …) | Engineering-only |

## Production-like catalog policy

```bash
CATALOG_ALLOW_ENGINEERING=false
# manage.py check --deploy must keep catalog.E001 clean
```

Only a human with `catalog.approve_game_product` may approve rows in Admin.
