# Dedicated-origin J2ME isolation PoC — 2026-10-21

**Status:** Proof of concept only. Production player still uses same-origin `/runtime/j2me-frame.html`.

## Topology

- `http://launcher.localhost:<port>` — parent / catalog surrogate
- `http://j2me.localhost:<port>` — dedicated J2ME runtime origin (same port, distinct host → distinct origin; not port-only isolation)

## Proven

| Check | Result |
| --- | --- |
| Allowlisted Dot boots | PASS |
| Parent DOM access from frame | Blocked (`SecurityError`) |
| Launcher cookies in frame | Not visible |
| Launcher IndexedDB listing | Fenced / not visible |
| Spoofed session commands | No reply |
| `parentOrigin === frameOrigin` rejected | `J2ME_PARENT_ORIGIN_NOT_DISTINCT` |
| Unknown JAR | Denied (`JAR_*`) |
| Network fetch | Restricted |
| Dispose clears session | PASS |
| RMS migration import + keep-existing retry | PASS |

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-isolated-origin-poc.cjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-rms-migration-poc.cjs
```

Run logs: `j2me-isolated-origin-poc-run-20261021.txt`, `j2me-rms-migration-poc-run-20261021.txt`.
