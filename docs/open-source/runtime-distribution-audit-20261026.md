# Public runtime distribution audit & fix (2026-10-26)

## Finding

`scripts/web-entrypoint.sh` previously copied **all** private `.data`/`.wasm` into `/app/public/cores`, making them anonymously fetchable at `/cores/...` regardless of catalog product approval. Service Worker cache-on-fetch for `/cores/` would also retain any successfully fetched payload.

## Fix

| Layer | Behavior |
| --- | --- |
| Allowlist | `docs/open-source/browser-distributable-allowlist.json` (+ runtime copies) |
| Sync | `scripts/sync-private-cores.mjs` — deny-by-default in `PUBLIC_BROWSER` |
| Provision | `scripts/provision-private-cores.py --mode PUBLIC_BROWSER\|LOCAL_FULL` |
| Entrypoint | Uses sync script; refuses unfiltered find/cp |
| Middleware | Returns 404 for NOT_CLEARED paths when mode is `PUBLIC_BROWSER` |
| Compose local | `RBG_CORE_PROVISION_MODE=LOCAL_FULL` (default) |
| Production | Must set `PUBLIC_BROWSER` |

## Cleared vs blocked (59)

- **AUTHORIZED_BROWSER_DISTRIBUTABLE:** 55 (incl. bluemsx with in-repo patches)
- **NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION:** 4 — `81_eo`×2, `virtualjaguar_js`×2 (`not-cleared-cores.md`)

## Anonymous HTTP evidence (`PUBLIC_BROWSER`)

```
PRIVATE_CORE_SYNC_OK mode=PUBLIC_BROWSER copied=55 blocked_skipped=4
genesis_plus_gx-wasm.data -> 200
bluemsx-wasm.data -> 200
81_eo-wasm.data -> 404
virtualjaguar_js-wasm.data -> 404
```

See `anonymous-core-access-20261026.txt`, `public-browser-sync-20261026.txt`.
