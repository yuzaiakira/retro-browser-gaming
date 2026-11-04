# Staging HTTPS report (PH-14.5)

**Date:** 2026-11-04  
**Status:** **BLOCKED_EXTERNAL** — no authorized staging DNS/TLS credentials in this environment.

## What was prepared / verified locally

| Check | Result |
|---|---|
| Native Compose stack up | PASS (`api`/`web`/`db`/`edge`/`object-store` healthy) |
| Local loopback HTTP launcher | Available via Compose edge (engineering) |
| Authorized staging HTTPS deploy | **NOT performed** |
| Stock-browser trusted CA staging | **NOT_VERIFIED** |
| Production-like `manage.py check --deploy` on staging host | **NOT_VERIFIED** |

Local dual-host developer HTTPS (`scripts/generate-dev-https-certs.sh`, `scripts/dev-https-edge-proxy.mjs`) remains **LOCAL_HTTPS** only — see `docs/production-staging-verification.md`. It must not be claimed as staging acceptance.

## Required staging controls (checklist for ops)

1. Enforce HTTPS (HTTP redirect or refuse) with public/org-trusted certs  
2. Secure-context features (SW, OPFS) under HTTPS origins  
3. Preserve COOP/COEP/CORP  
4. Preserve path-scoped CSP (`/runtime/*` vs shell); **shell must keep `unsafe-eval` disabled**  
5. Do not broaden runtime `unsafe-eval`  
6. Service-worker lifecycle + offline cold-start on staging  
7. Source-delivery endpoint on a **separate** host/path from game CDN  
8. Staging must not become a public game CDN  
9. Auth for admin; `CATALOG_ALLOW_ENGINEERING` false unless explicitly acknowledged  
10. PRIVATE_ONLY cores remain restricted (`PUBLIC_BROWSER` provision mode)

## Evidence

- Compose health: `.runtime/test-evidence/PH-14/` (compose ps at validation time)  
- Prior policy: `docs/production-staging-verification.md`  
- CSP: `docs/reports/runtime-csp-audit.md` (`RUNTIME_CSP_SECURITY_PASS`)

## Verdict

**STAGING_HTTPS_ACCEPTANCE = BLOCKED_EXTERNAL**  
Do not claim staging HTTPS PASS without testing the actual deployed environment.
