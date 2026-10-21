# J2ME js2me security hardening — 2026-10-21

Architecture notes: `docs/j2me-security-architecture.md`.

## Controls

| Control | Behavior |
| --- | --- |
| JAR allowlist | **Production always enforces** SHA-256 in `/runtime/j2me-allowlist.json`. No `allowUntrusted` bypass; client-injected flag is ignored |
| ZIP limits | Max 8 MiB archive, 512 entries, 16 MiB uncompressed total, 4 MiB/entry; reject `..` / encoded traversal; ZIP64 rejected; CD↔local size/name cross-check; duplicate names rejected |
| Manifest | Require `MIDlet-1` + `MIDlet-Name` |
| Network | `fetch` / XHR / WebSocket / EventSource / `sendBeacon` / `window.open` stubbed after allowlist load; `Connector.open` denied |
| Storage fence | `localStorage` limited to suite keys; IndexedDB only `retro-j2me-rms` |
| CSP | `/runtime/*` retains `script-src 'unsafe-eval'` (js2me engines); `connect-src 'self' blob:` |
| Same-origin iframe | Required for IDB + core scripts; JS API overrides are **not** a complete browser trust boundary — see residual risk doc |

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-security-smoke.cjs
```

```text
J2ME_SECURITY_PASS {"allowlistedBoot":true,"unknownDenied":"JAR_NOT_ALLOWLISTED","bypassIgnored":"JAR_NOT_ALLOWLISTED","traversalDenied":"JAR_PATH_TRAVERSAL","bombDenied":"JAR_ENTRY_TOO_LARGE","mismatchDenied":"JAR_LOCAL_SIZE_MISMATCH","dupDenied":"JAR_DUPLICATE_ENTRY"}
```

Run log: `PH-06/j2me-security-run-20261021.txt`.
