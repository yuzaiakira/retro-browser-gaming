# J2ME release-readiness audit — 2026-10-21

## Defects found and fixed

1. **Same-name promotion hole** — reinstall of the same manifest version deleted `j2me-runtime-<version>` before copy, which could invalidate the active cache. **Fix:** immutable `j2me-runtime-gen-*` generations; pointer switch after ready marker.
2. **Unauthenticated ACTIVATE_UPDATE** — any same-origin client could `skipWaiting`. **Fix:** authorize only WindowClients whose pathname is `/j2me-install.html`.
3. **HTTPS frame-ancestors** — Compose env listed only `http://` launcher origins, blocking HTTPS iframes. **Fix:** include `https://launcher.localhost:13443` (and related) in default `LAUNCHER_FRAME_ANCESTORS`.
4. **CSP https frame-src** — launcher CSP lacked `https://j2me.localhost`. **Fix:** next.config + middleware defaults.

## Evidence

| Gate | Result |
| --- | --- |
| Promotion faults + ACTIVATE auth | PASSED `j2me-sw-promotion-faults-20261021.json` |
| Integrity / recovery (prior) | PASSED |
| Dedicated offline Dot/Paddle/Notes | PASSED `catalog-j2me-dedicated-offline-audit-run-20261021.txt` |
| LOCAL_HTTPS | PASSED `j2me-local-https-20261021.json` |
| Security / DOS / SNES / SMS | PASSED |
| PRODUCTION_STAGING | NOT_VERIFIED |

## Explicit non-claims

Promotion is **not** a single atomic CacheStorage API; safety is generation + pointer ordering. Local HTTPS is **not** production staging.
