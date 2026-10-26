# Public Alpha preparation (software-only)

**Scope:** Safe documentation and UX for a limited public MVP. Does **not** close P0 external gates (gamepad / iOS / staging HTTPS / product approvals).

## Honest capability messaging

| Mode | User expectation |
| --- | --- |
| Source-only clone | App builds; HTML5 Orbit path can work with seeded fixtures; WASM consoles need authorized private cores |
| Authorized full runtime | Import backup → provision → LOCAL_FULL |
| Unsupported / experimental | Keep ZX81, Jaguar, N64 as experimental; FBNeo/Atari ST blocked as before |

## Suggested Alpha surface (owner approval)

1. Chromium/desktop first; show clear unsupported-browser copy from existing browser-support docs.
2. Catalog: only product-approved titles (engineering fixtures stay gated).
3. Offline: Ready Offline only after real install + SHA-256 (existing behavior).
4. Feedback: minimal nonintrusive channel (issue template or external form) — no automatic PII collection in-app yet.
5. Do not auto-deploy staging or redefine P0 as COMPLETE.

## Known open gates (unchanged)

- Physical gamepad acceptance
- Real iOS Safari
- Authorized staging HTTPS
- Human product approval for catalog titles
