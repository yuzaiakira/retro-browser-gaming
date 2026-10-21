# J2ME security architecture and residual risk

## Production (catalog player) — current

| Control | Enforcement | Kind |
| --- | --- | --- |
| JAR allowlist | SHA-256 in `/runtime/j2me-allowlist.json`; **no bypass** | Application |
| ZIP hardening | Limits, traversal, duplicates, ZIP64 reject, CD↔local | Application |
| Network stubs | `fetch` / XHR / WS / EventSource / beacon / `open` | **JavaScript only** |
| Connector deny | MIDP `Connector.open` patched | **JavaScript only** |
| RMS IDB fence | Only `retro-j2me-rms` | **JavaScript only** |
| Message protocol | `origin` + `session`; FrameAdapter never forwards bypass | Application |
| CSP `/runtime/*` | `script-src 'self' blob: 'unsafe-eval'` (js2me needs eval); boot config in `j2me-boot.js` (no inline) | Browser |
| Frame sandbox | `allow-scripts allow-same-origin` on **same-origin** iframe | Browser (insufficient vs launcher) |

**Architectural residual risk:** The production J2ME frame shares the **launcher origin**. JS API overrides are **not** a browser trust boundary. A VM escape to arbitrary JS could still touch launcher cookies, other IDB databases (if fences fail), and same-origin APIs.

**Not claimed safe:** Arbitrary uploaded or commercial JARs.

**Catalog evidence:** Dot/Paddle/Notes production offline — `PH-06/catalog-j2me-offline-20261021.md`.

## Dedicated-origin PoC — tested, not production-switched

Hostnames `launcher.localhost` and `j2me.localhost` (same port, distinct hosts → distinct origins). Frame: `/runtime/j2me-isolated/*`.

| Control | Enforcement | Kind |
| --- | --- | --- |
| Distinct origins | Hostname split (not port-only) | **Browser** |
| Parent DOM / cookies | Cross-origin isolation | **Browser** |
| Launcher IDB | Separate origin storage | **Browser** |
| `parentOrigin` must ≠ frame origin | Init validation | Application |
| Session spoof rejection | Message filter | Application |
| RMS migration import | Size/id validated `importRmsMigration` | Application |
| Allowlist / ZIP / network stubs | Same as production on j2me origin | Mixed |

Evidence: `PH-06/j2me-isolated-origin-poc-20261021.md`, `j2me-rms-migration-poc-run-20261021.txt`.

### Offline PWA for dedicated origin (design)

- Dedicated origin needs its own Service Worker scope (or shared HTTPS reverse-proxy with path→host mapping that preserves origin).
- CORP `cross-origin` on j2me assets required under launcher COEP.
- Runtime + allowlist + js2me cores must be cached on the **j2me** origin; game JARs remain in launcher OPFS and are transferred via `postMessage` `File` (as today).
- Compose/local: prefer `*.localhost` or TLS-terminated `j2me.<app-host>` — not “different port on same host” for cookie isolation.

### RMS migration (PoC)

1. Read suite snapshots from launcher-origin `retro-j2me-rms`.
2. `postMessage` `importRmsMigration` with suite id allowlist + size caps.
3. First cutover may `overwrite:true`; retries use `overwrite:false` → `kept-existing`.
4. Keep launcher DB until offline restore on new origin is verified; then optional tombstone.

**Production FrameAdapter is unchanged** until Compose hostname + SW + catalog offline pass on the isolated path.

## Production player path

Catalog play → `FrameAdapter.load` → same-origin `/runtime/j2me-frame.html` → `validateJarBuffer` always.
