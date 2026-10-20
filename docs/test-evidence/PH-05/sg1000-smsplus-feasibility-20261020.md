# SG-1000 / smsplus feasibility — 2026-10-20

## Question

Can the pinned EmulatorJS `smsplus` core execute SG-1000 ROMs as a **distinct** platform from Master System?

## Technical result

Yes. Local Chromium smoke with `core=smsplus`, control scheme `segaMS`, and an SG-1000 `.sg` ROM produced:

- Non-black framebuffer
- Input-driven frame change
- Save/load state bytes
- Offline-after-load (same pattern as SMS)

This does **not** inherit Master System catalog offline evidence; SG-1000 needs its own catalog identity, fixture, and offline proof.

## Legal path (resolved later same day)

Earlier Bootskell/MikeMech candidates lacked citable redistribution text. **RetroPIPE** (`visrealm/retropipe` v0.2 `retropipe_v0-2-0_sc3000.sg`, MIT) was vendored as `.fixtures/mit-sg1000-retropipe.sg` and verified playable + catalog offline (`PH-05/sg1000-gameplay-20261020.md`, `catalog-sg1000-offline-20261020.md`).
