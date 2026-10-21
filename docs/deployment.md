# Deployment

`compose.yaml` runs PostgreSQL 17, persistent S3-compatible SeaweedFS storage, Django/Gunicorn API, the Next standalone web server, and an **edge** nginx that Host-routes `launcher.localhost` (app) and `j2me.localhost` (J2ME runtime) on one published port. Prefer `http://launcher.localhost:3000` (or `:13000` with a local override). The web server rewrites `/api/v1/*` and `/dev-assets/*` to the private API service. The browser never receives storage credentials. J2ME cutover: `NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN` (default `true`); see `docs/j2me-security-architecture.md`.

## Local Compose configuration

```bash
cp .env.example .env
python3 scripts/init-env.py
./scripts/compose.sh up --build -d
./scripts/compose.sh ps
./scripts/compose.sh exec -T api python manage.py verify_storage
./scripts/compose.sh exec -T api python manage.py test tests -v 2
```

`scripts/compose.sh` resolves an injected host proxy at launch and maps it into Docker build networking. When the platform proxy terminates TLS, its CA is mounted only with a BuildKit secret during package installation. No proxy address, credential, or certificate is baked into an image. SeaweedFS is pinned by its image digest and persists under the Compose object-data volume. The complete native stack was run successfully on 2026-10-19; see `test-evidence/PH-01/compose-20261019.md`.

## Required environment boundary

`S3_ENDPOINT_URL` is private container-to-store traffic. `S3_PUBLIC_ENDPOINT_URL` must be browser reachable and may never contain credentials. `API_INTERNAL_URL` is web-container-only. `NEXT_PUBLIC_*` variables must never contain secrets. In the local SeaweedFS profile, `S3_BROWSER_PROXY=true` routes byte ranges through the same-origin `/dev-assets/` gateway because that server rejects unsigned CORS preflight requests for presigned URLs. Production S3 providers can keep `S3_BROWSER_PROXY=false` and use their configured CORS policy directly.

The frontend sends COOP `same-origin` and COEP `require-corp`, enabling threaded cores only in an isolated context. All core, shell, and game resources must therefore be same-origin or send compatible CORP/CORS headers.

## Production requirements

Use a maintained native PostgreSQL service, maintained S3 provider, TLS termination, secret manager, explicit CORS origin, health monitoring, encrypted backups plus restore tests, log retention, resource limits, and a release migration job. Keep debug off, set `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `TRUST_PROXY=true` only behind a trusted proxy, and create a least-privilege storage identity.

Do not expose Django development assets, the object-store API, or an unauthenticated Admin publicly. Review core redistribution licenses and game evidence before publishing any console release.

## J2ME dedicated-origin recovery

| Scenario | Expected behavior |
| --- | --- |
| Partial / failed runtime precache | Staging cache discarded; previous active runtime retained |
| Corrupted cached asset | Offline launch fails VERIFY with actionable error; online reinstall repairs; RMS preserved |
| SW update during gameplay | New worker stays waiting until install surface sends `ACTIVATE_UPDATE` |
| Cutover rollback | Export dedicated RMS → prefer-newer merge into launcher **before** setting `NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=false` and rebuilding |
| Unknown Host | Edge returns 421; do not fall through to launcher |
| J2ME hostname `/api/*` | Middleware 403 |

Regenerate integrity digests after editing runtime public assets:

```bash
python3 scripts/generate-j2me-runtime-manifest.py
```

### Local HTTPS (developer)

```bash
bash scripts/generate-dev-https-certs.sh
./scripts/compose.sh up -d
node scripts/dev-https-edge-proxy.mjs   # https://launcher.localhost:13443 → edge :13000
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-local-https-smoke.cjs
```

Evidence label: **LOCAL_HTTPS_VERIFIED** only. Production/staging with real certificates remains **NOT_VERIFIED**. Ensure `LAUNCHER_FRAME_ANCESTORS` lists the HTTPS launcher origin used by the TLS terminator.
