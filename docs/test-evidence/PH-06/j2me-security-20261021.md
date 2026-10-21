# J2ME js2me security hardening — 2026-10-21

## Controls

| Control | Behavior |
| --- | --- |
| JAR allowlist | Default deny; SHA-256 must be in `/runtime/j2me-allowlist.json` unless `allowUntrusted:true` |
| ZIP limits | Max 8 MiB archive, 512 entries, 16 MiB uncompressed total, 4 MiB/entry; reject `..` paths |
| Manifest | Require `MIDlet-1` + `MIDlet-Name` |
| Network | `fetch` / `XMLHttpRequest` / `WebSocket` stubbed after allowlist load; `Connector.open` denied |
| Storage fence | `localStorage` limited to suite keys; IndexedDB only `retro-j2me-rms` (FileConnection DB blocked) |
| CSP | `/runtime/*` retains `script-src 'unsafe-eval'` (js2me engines); `connect-src 'self' blob:` |
| Same-origin iframe | Required for IDB + core scripts; MIDlets remain untrusted — do not enable arbitrary JAR loads |

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-security-smoke.cjs
```

```text
J2ME_SECURITY_PASS {"allowlistedBoot":true,"unknownDenied":"JAR_NOT_ALLOWLISTED","traversalDenied":"JAR_PATH_TRAVERSAL","bombDenied":"JAR_ENTRY_TOO_LARGE","networkFenced":true}
```
