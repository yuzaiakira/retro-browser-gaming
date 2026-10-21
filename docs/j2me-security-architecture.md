# J2ME security architecture and residual risk

## Enforced controls (tested)

| Control | Mechanism | Evidence |
| --- | --- | --- |
| JAR allowlist | SHA-256 must match `/runtime/j2me-allowlist.json`; **no production bypass** | `PH-06/j2me-security-20261021.md` (`bypassIgnored`) |
| ZIP hardening | Entry limits, traversal, duplicates, ZIP64 reject, CD↔local cross-check | Isolated `inspectZip` harness in security smoke |
| Network JS stubs | `fetch` / XHR / WebSocket / EventSource / `sendBeacon` / `window.open` after boot | Security smoke + CSP `connect-src 'self' blob:` on `/runtime/*` |
| Connector | MIDP `Connector.open` patched to throw | Frame boot hook |
| RMS IDB fence | Only DB `retro-j2me-rms` may open | `j2me-secure.js` |
| Message protocol | `origin` + `session` checks; FrameAdapter never forwards bypass flags | `frame-adapter.ts`, `j2me-frame.js` |

## Architectural boundary (same-origin iframe)

`FrameAdapter` loads `/runtime/j2me-frame.html` with sandbox `allow-scripts allow-same-origin`.

**Why:** Offline PWA caching, self-hosted `/cores/js2me/*` scripts, and IndexedDB RMS require a non-opaque origin aligned with the launcher.

**Residual risk:** A compromised VM / successful escape to arbitrary JavaScript in the frame shares the **launcher origin**. Overridden JS APIs are **not** a complete browser security boundary. Same-origin code could still theoretically touch:

- Cookies for the site origin
- Other IndexedDB databases (mitigated by `indexedDB.open` fence, but fences are JS-level)
- DOM of the frame (not parent DOM without explicit access; parent is reachable via `window.parent` for `postMessage`)

**Not claimed safe:** Arbitrary user-uploaded or commercial JARs.

**Future isolation:** A dedicated J2ME origin (e.g. `j2me.` subdomain) with postMessage RMS proxy would strengthen browser-enforced isolation; deferred while keep allowlist-only first-party fixtures.

## Production player path

Catalog play uses `FrameAdapter.load` → `postMessage({ type:'init', file, core:'js2me', ... })` with **no** `allowUntrusted` field. Even if a client injects `allowUntrusted:true`, `j2me-frame.js` ignores it and always calls `validateJarBuffer(buffer)`.
