# Runtime CSP audit

Date: 2026-11-02  
Marker: **`RUNTIME_CSP_SECURITY_PASS`**  
Evidence: `.runtime/test-evidence/PH-12/soak/csp-audit/`

## Problem (before)

`next.config.mjs` attached CSP on both `/:path*` and `/runtime/:path*`. Browsers enforce **all** CSP headers. A temporary runtime policy added global-looking `'unsafe-inline'` to unblock MAME after a stale web image + stacked headers. That must not become the production emulator-frame policy.

## Why inline appeared necessary

Investigation of MAME glue (`rbg_arcade.js`) showed `Function(` usage (needs `'unsafe-eval'`), WASM (needs `'wasm-unsafe-eval'`), and **external** script loads only from `mame-frame.js`. Frame HTML has no inline `<script>` bodies. Stacked/conflicting headers produced CSP noise; the durable fix is a **single CSP owner** per path.

Separately, shell downloads use `hash-wasm` (WebAssembly). A shell CSP without `'wasm-unsafe-eval'` blocked integrity hashing and left installs stuck on “Download & try” with no Play link.

## After (path-scoped)

CSP is set in `apps/web/src/middleware.ts` only (removed overlapping CSP from `next.config.mjs` headers).

| Surface | script-src summary |
|---------|-------------------|
| Launcher shell (HTML/App Router) | `'self' blob: 'unsafe-inline' 'wasm-unsafe-eval'` — Next flight payloads need inline; hash-wasm needs wasm; **no** `'unsafe-eval'` |
| `/runtime/*` emulator frames | `'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'` — **no** `'unsafe-inline'` |
| J2ME dedicated host | unchanged dedicated policy (eval + inline for legacy VM) |

## Security checks

| Check | Result |
|-------|--------|
| Runtime header lacks script `'unsafe-inline'` | PASS |
| Runtime allows `'wasm-unsafe-eval'` + `'unsafe-eval'` | PASS |
| Shell header lacks `'unsafe-eval'` | PASS |
| Shell allows `'wasm-unsafe-eval'` (downloads) | PASS |
| Unauthorized inline script on `/runtime/mame-frame.html` blocked | PASS |
| Authorized eval/Function on `/runtime/csp-security-probe.js` allowed | PASS |
| Arcade gameplay/save/offline on clean image | PASS |

Probe assets: `/runtime/csp-security-probe.html` + `.js` (external only).

## Explicit non-goals

- Product approval still PENDING  
- OS PWA / physical devices NOT_VERIFIED  
- This is not a claim that Next can drop `'unsafe-inline'` without a nonce migration
