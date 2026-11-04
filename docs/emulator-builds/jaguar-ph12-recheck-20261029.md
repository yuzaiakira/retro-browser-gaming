# PH-12.1 Jaguar re-check (2026-10-29)

**Status:** still **EXPERIMENTAL** — no VERIFIED_PLAYABLE claim.

## Reproduced

| Core | Fixture | Lit pixels after 20s | Notes |
| --- | --- | --- | --- |
| `virtualjaguar_js` | `mit-jaguar-2048.jag` | 0 | `Size is zero`; `Could not get screen dimensions!` |
| `virtualjaguar` | `mit-jaguar-2048.jag` | 0 | Same |
| `virtualjaguar_js` | `mit-jaguar-2048.bin` | ≈6824 | Prior session: no input-driven delta |

Smoke currently fails earlier than the black-FB assert because early save-state probe returns empty (`saveState:false`).

## Blocker (unchanged)

MIT jag2048 is **JST_JAGSERVER** (`JAGR` header). Pinned EmulatorJS Virtual Jaguar WASM still does not produce a playable framebuffer for this cart. Independent `virtualjaguar_js` rebuild (2026-10-22) did not clear the gate.

## Honest next options (not done)

1. Newer upstream WASM that correctly loads JAGR/Jaguar Server homebrew, with corresponding-source clearance.
2. A different **MIT/GPL** Jaguar fixture in Alpine/`.j64` form that the pinned core actually renders — none selected yet with provenance + license ready for this repo.
3. Keep catalog seed EXPERIMENTAL; do not product-approve.
