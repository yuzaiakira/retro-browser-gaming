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
| Offline runtime | `j2me-sw.js` atomic staging → promote; SHA-256 + byteSize | Browser SW |
| Precache allowlist | Path regex only (`/runtime/j2me*`, `/cores/js2me/`, install) | Application |
| SW activation | `ACTIVATE_UPDATE` from install surface only (no mid-game skipWaiting) | Application |
| RMS migration | Narrow payload; **prefer-newer** merge; source retained | Application |
| RMS rollback | Export dedicated suites → launcher merge (never clobber newer) | Application |

**Authentic offline evidence:** `PH-06/catalog-j2me-dedicated-offline-20261021.md` (+ reliability re-run). Integrity/recovery: `j2me-sw-integrity-20261021.json`, `j2me-cache-recovery-20261021.json`, `j2me-rms-rollback-safety-20261021.json`.

**Not claimed safe:** Arbitrary uploaded or commercial JARs (allowlist remains).

## Runtime integrity

- Manifest: `apps/web/public/runtime/j2me-runtime-manifest.json` (regenerate via `python3 scripts/generate-j2me-runtime-manifest.py`).
- Excludes `/j2me-sw.js` (browser-managed). Core `js2me/` assets come from release `licensed_asset_manifest` digests.
- Launcher loads the manifest **same-origin** (CSP `connect-src 'self'`), then posts J2ME-origin URLs + digests to the install iframe.
- HTTP 200 alone is never treated as integrity proof.

## Rollback

1. **Before** disabling cutover: call `rollbackDedicatedRmsToLauncher()` (or equivalent EXPORT_RMS + prefer-newer launcher merge) so dedicated progress is not stranded.
2. Set `NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=false`.
3. Rebuild web image; FrameAdapter loads same-origin `/runtime/j2me-frame.html`.
4. Legacy launcher `retro-j2me-rms` is never deleted by migration; prefer-newer prevents stale snapshots from overwriting newer dedicated (or newer launcher) saves.

Retaining old launcher snapshots alone does **not** guarantee they contain the newest progress after dedicated play.

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

Terminate TLS at a reverse proxy with certificates for `app.example` and `j2me.app.example` (or equivalent). Keep host-only cookies on the launcher host; never set `Domain=.example` cookies that the J2ME host can read. Preserve COOP/COEP; serve j2me assets with `Cross-Origin-Resource-Policy: cross-origin`. Service Workers and secure contexts require HTTPS (or localhost).

**Verification status:** HTTPS staging with real certificates is **NOT_VERIFIED** in this repository session. Localhost HTTP Host-routing does not prove production TLS behavior.
