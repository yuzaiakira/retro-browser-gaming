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

## Legal blocker (why not VERIFIED_PLAYABLE)

Candidate homebrew examined:

| Candidate | Source | License finding |
|---|---|---|
| Bootskell (inufuto) | SMS Power `Bootskell-SG-1.0.zip` | SMS Power page has **no Software licence** field (`Source: no`). Author site `inufuto.web.fc2.com` was unreachable in this session (timeout); Wayback did not yield a clear redistributable permission quote we can cite. |
| Mike Mech SG | SMS Power `MikeMech-SG-1.0.0.zip` | Zip contains only `MikeMech.sg` — no LICENSE file. |

**Decision:** Do **not** vendor or seed an SG-1000 ROM. Do not mark the support-matrix playable checkbox. Retain `smsplus` extension widen to `sg` in seed for when a MIT/PD/explicit-freeware fixture is available.

## Next step

Obtain an SG-1000 homebrew with explicit MIT/CC0/GPL redistribution text + SHA-256, then seed `sega-sg1000` and run `catalog-console-offline` with `CATALOG_OFFLINE_ONLY=sg1000`.
