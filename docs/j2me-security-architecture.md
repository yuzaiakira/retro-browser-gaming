# J2ME security architecture and residual risk

## Production (cutover 2026-10-21) — dedicated origin

Browser traffic enters the Compose **edge** nginx (`infra/reverse-proxy/edge.conf`) on one published port with **Host-based** routing:

| Host | Role |
| --- | --- |
| `launcher.localhost` | Next.js launcher, catalog, OPFS games, shell SW |
| `j2me.localhost` | J2ME runtime only (`/runtime/*`, `/cores/js2me/*`, `/j2me-sw.js`, `/j2me-install.html`) |

Cutover flag: `NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=true` (Compose default after PH-06 dedicated offline gate). Set `false` and rebuild to roll back to same-origin `/runtime/j2me-frame.html`.

| Control | Enforcement | Kind |
| --- | --- | --- |
| Distinct origins | Hostname split (not port-only) | **Browser** |
| Parent DOM / cookies | Cross-origin iframe | **Browser** |
| Launcher IndexedDB | Separate origin | **Browser** |
| JAR allowlist | SHA-256; no bypass | Application |
| ZIP hardening | Limits, traversal, dup, ZIP64, CD↔local | Application |
| Network stubs / Connector | Still present inside j2me origin | **JavaScript only** (defense in depth) |
| Message protocol | `event.source`, `event.origin === targetOrigin`, session | Application |
| `parentOrigin` ≠ frame origin | Init validation | Application |
| CSP j2me host | `unsafe-eval` for js2me; `frame-ancestors` launcher only | Browser |
| CORP | `cross-origin` on j2me assets (launcher COEP) | Browser |
| Offline runtime | `j2me-sw.js` precache via `/j2me-install.html` | Browser SW |
| RMS migration | Narrow `importRmsMigration` payload; source retained | Application |

**Authentic offline evidence:** `PH-06/catalog-j2me-dedicated-offline-20261021.md` (`mockedAssets:false`, `routeFulfill:false`).

**Not claimed safe:** Arbitrary uploaded or commercial JARs (allowlist remains).

## Rollback

1. Set `NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=false`.
2. Rebuild web image; FrameAdapter loads same-origin `/runtime/j2me-frame.html`.
3. Launcher-origin `retro-j2me-rms` was **not** deleted during migration — legacy saves remain.

## Local port remap

If host `:3000` is busy, use gitignored `compose.override.yaml` to publish **edge** (not web) on `13000`:

```yaml
services:
  api:
    ports: !override
      - "127.0.0.1:18000:8000"
  web:
    ports: !override []
  edge:
    ports: !override
      - "127.0.0.1:13000:80"
```

Open `http://launcher.localhost:13000/` (not raw `127.0.0.1`) so the dedicated hostname origin is used.

## HTTPS production design

Terminate TLS at a reverse proxy with certificates for `app.example` and `j2me.app.example` (or equivalent). Keep host-only cookies on the launcher host; never set `Domain=.example` cookies that the J2ME host can read. Preserve COOP/COEP; serve j2me assets with `Cross-Origin-Resource-Policy: cross-origin`.
