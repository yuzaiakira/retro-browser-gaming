# Production-like staging HTTPS verification

**Status (2026-10-22):** **BLOCKED_EXTERNAL** — no authorized staging DNS/TLS credentials on this workstation.

Local dual-host HTTPS with a developer CA is **LOCAL_HTTPS_VERIFIED** only (`docs/test-evidence/PH-06/j2me-local-https-20261021.json`). That is **not** `PRODUCTION_STAGING_VERIFIED`.

Related: `docs/deployment.md`, `docs/j2me-security-architecture.md`.

---

## Prerequisites (ops-owned)

| Item | Owner |
| --- | --- |
| Staging DNS for launcher + J2ME dedicated host | Ops |
| Trusted public CA certificates (or org-trusted) | Ops |
| Secrets manager values (Django secret, DB, S3) — never commit | Ops / Security |
| `DJANGO_DEBUG=false`, `CATALOG_ALLOW_ENGINEERING` unset/false | Release manager |
| `CSRF_TRUSTED_ORIGINS`, `DJANGO_ALLOWED_HOSTS`, `LAUNCHER_FRAME_ANCESTORS` include HTTPS origins | Ops |
| Authorization to deploy **staging only** (not production) | Product / Ops |

Do not change DNS, secrets, or external infrastructure without explicit authorization.

---

## Procedure

### 1. Deploy staging from a committed revision

1. Record Git SHA to deploy.
2. Apply migrations; confirm health endpoints.
3. Run `python manage.py check --deploy` — must be clean (no `catalog.E001`).
4. Confirm Admin is authenticated/staff-only; no public debug.

### 2. TLS and hostnames

| Check | Expected |
| --- | --- |
| Certificate chain | Trusted by stock browsers (no user-installed CA) |
| Hostnames | Match launcher + J2ME dedicated origins |
| HTTP → HTTPS | Redirect or refuse plaintext |
| Renewal | Document ACME/ops schedule |

### 3. Browser security headers

| Header / behavior | Expected |
| --- | --- |
| Secure cookies | `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` |
| COOP / COEP | `same-origin` / `require-corp` (threaded PSP) |
| CSP `frame-src` | Includes `blob:` (HTML5 Orbit) **and** HTTPS J2ME host |
| CORS | Limited to allowed origins |
| CORP | Launcher same-origin; J2ME cross-origin as designed |

### 4. Functional smoke (staging)

```bash
# Replace with staging URLs after cutover authorization
# 1) Catalog browse (product-approved titles only when engineering off)
# 2) Install engineering title only if CATALOG_ALLOW_ENGINEERING_IN_PRODUCTION explicitly acknowledged
# 3) Offline cold-start
# 4) Genesis + PSP (COI) + one J2ME dedicated-origin title
# 5) SW install / update waiting worker does not disrupt save (OFF-005 class)
```

Capture HAR or notes + screenshots under `docs/test-evidence/PH-11/staging-*` with date and SHA.

### 5. J2ME dedicated origin

| Check | Expected |
| --- | --- |
| Dual-host routing | Unknown Host → 421; no launcher fallthrough |
| J2ME `/api/*` | 403 |
| SW generation / integrity | Failed precache does not promote |
| RMS | Survives SW recovery |

### 6. Rollback readiness

1. Previous image/tag identified.
2. DB migration rollback plan documented (forward-fix preferred).
3. Product revoke path understood (API hide immediate; S3 presign TTL ≤ `S3_PRESIGNED_URL_EXPIRES`).

---

## Local HTTPS (developer only)

```bash
bash scripts/generate-dev-https-certs.sh
./scripts/compose.sh up -d
node scripts/dev-https-edge-proxy.mjs   # https://launcher.localhost:13443
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-local-https-smoke.cjs
```

Label result **LOCAL_HTTPS_VERIFIED** only.

---

## Failure criteria

- Untrusted cert forced on end users.
- Engineering catalog accidentally public (`catalog.E001` bypass).
- COOP/COEP missing → PSP falsely advertised.
- CSP without `blob:` → Orbit / native-html hang.
- Claiming staging PASS from localhost CA evidence.

## Owner

Ops executes staging; Release manager signs the gate; Security reviews header/cookie findings.
