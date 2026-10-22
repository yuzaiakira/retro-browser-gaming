# Product release shortlist — 2026-10-22

**Audience:** product owner (requires `catalog.approve_game_product`)  
**Agent role:** prepare only — **no approvals applied**  
**Live DB:** 42 published, **42 pending**, **0 approved**, **0 rejected** (Compose API 2026-10-22)

Full packets: `docs/catalog-product-approval-report-20261021.md`.  
Policy: `docs/deployment.md` (DISTRIBUTION ≠ ENGINEERING ≠ PRODUCT).

---

## Decision summary (proposed)

| Bucket | Count | Product action |
| --- | --- | --- |
| **Proposed public v1** | 24 | Approve only if product wants a playable homebrew catalog |
| **Hold engineering-only** | 14 | Leave `pending` (diagnostics / minimal Dot fixtures) |
| **Do not approve (EXPERIMENTAL)** | 2 | Prefer **Reject** with note, or leave pending forever |
| **Already out of catalog** | — | 32X / Sega CD / commercial J2ME — not listed |

These buckets are **recommendations**. Only a human with `catalog.approve_game_product` may change status in Admin.

---

## A — Proposed public v1 (gameplay + evidence)

Approve individually via Admin → **Approve for public product catalog**. Confirm a `ProductApprovalDecision` row each time.

| Slug | Console | License | Gameplay / offline evidence | Known limits |
| --- | --- | --- | --- | --- |
| `orbit-catch` | browser | MIT first-party | PH-02/07/11 Orbit; CSP+origin fix 2026-10-22 | HTML5 only |
| `mit-genesis-breakout` | sega-md | MIT | PH-05 + PH-08 AUD-001 | — |
| `mit-genesis-pong` | sega-md | MIT | PH-05 genesis-pong | — |
| `mit-sms-ninjagirl` | sega-ms | MIT | PH-05 SMS | — |
| `mit-sms-sushinights` | sega-ms | MIT | PH-05 expansion | Distinct SKU from GG sushi |
| `mit-gg-waternet` | sega-gg | MIT | PH-05 GG | — |
| `mit-gg-sushinights` | sega-gg | MIT | PH-05 underrepresented | Distinct SKU from SMS sushi |
| `mit-gg-snepzhen` | sega-gg | MIT | PH-05 | Card-game UX |
| `mit-nes-table-tennis` | nes | MIT | PH-05 | — |
| `mit-nes-falling` | nes | MIT | PH-05 expansion | — |
| `mit-snes-gothicvania` | snes | MIT | PH-05 | — |
| `gpl-gb-big2small` | gb | GPL-3.0 | PH-05 expansion | Show GPL notice |
| `mit-gbc-waternet` | gbc | MIT | PH-05 | — |
| `mit-gbc-littlegreenblob` | gbc | MIT | PH-05 | — |
| `mit-gba-dino` | gba | MIT | PH-05 | — |
| `mit-gba-nonogram` | gba | MIT | PH-05 expansion | — |
| `mit-a2600-berta` | atari-2600 | MIT | PH-05 | — |
| `mit-a2600-pipes` | atari-2600 | MIT | PH-05 | SuperChip |
| `mit-sg1000-retropipe` | sega-sg1000 | MIT | PH-05 | — |
| `mit-wswan-chips1` | wswan | MIT | PH-05 | — |
| `gpl-a7800-rfk` | atari-7800 | GPL-2.0 | PH-05 | Show GPL notice |
| `mit-dos-floppybird` | dos | MIT | PH-05 jsdos | jsdos path only |
| `mit-j2me-paddle` | j2me | MIT first-party | PH-06 | Dedicated origin |
| `mit-j2me-notes` | j2me | MIT first-party | PH-06 | Dedicated origin |

**Optional expansion (still gameplay, product may defer):**  
`cc0-a5200-culomin`, `mit-vb-spong`, `mit-c64-wildboa`, `mit-zx-desolate`, `mit-cpc-brickblaster`, `mit-nds-dinods` — VERIFIED_PLAYABLE but later-wave / niche; not required for a minimal P0 public set.

---

## B — Hold engineering-only (leave pending)

Useful for QA when `CATALOG_ALLOW_ENGINEERING=true`. **Do not** auto-publish to production catalog.

| Slug | Why hold |
| --- | --- |
| `mit-gb-dot`, `mit-lynx-dot`, `mit-amiga-dot`, `mit-msx-dot`, `mit-ps1-dot`, `mit-psp-dot`, `mit-j2me-dot` | Minimal Dot / tech fixtures |
| `huc-pce-scroll` | Example scroll ROM, not a product game |
| `gpl-ngp-joypad`, `gpl-ngpc-test` | Input/hardware tests |
| (optional hold) `mit-amiga-dot`, `mit-msx-dot` | Already VERIFIED; still diagnostic class |

Production must keep `CATALOG_ALLOW_ENGINEERING=false` so these stay invisible without product approval.

---

## C — Do not approve (EXPERIMENTAL)

| Slug | Status | Required product note |
| --- | --- | --- |
| `mit-jaguar-2048` | EXPERIMENTAL — no verified interactive play | Reject or leave pending; never approve on current evidence |
| `mit-zx81-dot` | EXPERIMENTAL — not interactive | Same |

---

## How the product owner executes

1. Staging/prod: `CATALOG_ALLOW_ENGINEERING` unset/false; `check --deploy` clean (`catalog.E001`).
2. Log into Django Admin as a user with `catalog.approve_game_product`.
3. For each slug in bucket A (or subset): open Game → **Approve for public product catalog** → notes e.g. `public-v1 2026-10-22`.
4. Optionally **Reject** bucket C with reason `experimental-not-playable`.
5. Spot-check: anonymous catalog lists only approved titles; download-manifest 200 for one approved slug; 404 for a pending Dot.

**Revoke reminder:** API/gateway hide immediately; direct S3 presigns may live until TTL (default 900s); offline OPFS installs are not remotely deleted.

---

## External gates still required before COMPLETE

This shortlist does **not** clear IN-002-P/D, IOS-001, or staging HTTPS. Those remain BLOCKED_EXTERNAL until hardware/Ops execute the existing runbooks.
