# Deployment

`compose.yaml` runs four services: PostgreSQL 17, a development S3-compatible MinIO object store, Django/Gunicorn API, and the Next standalone web server. Browser traffic enters at `http://localhost:3000`; the web server rewrites `/api/v1/*` and `/dev-assets/*` to the private API service. The browser never receives storage credentials.

## Local Compose configuration

```bash
cp .env.example .env
python3 scripts/init-env.py
docker compose up --build -d
docker compose ps
docker compose exec api python manage.py verify_storage
docker compose exec api python manage.py test tests -v 2
```

The source-built MinIO image is only a development convenience. It is pinned because the previously selected binary endpoint became unavailable. Compose needs a Docker-capable host; it was not run in this execution environment and therefore DEP-001 remains blocked.

## Required environment boundary

`S3_ENDPOINT_URL` is private container-to-store traffic. `S3_PUBLIC_ENDPOINT_URL` must be browser reachable and may never contain credentials. `API_INTERNAL_URL` is web-container-only. `NEXT_PUBLIC_*` variables must never contain secrets. S3 CORS must permit `GET`/`HEAD`, lower-case `range` and `if-range` request headers, and expose `ETag`, `Content-Range`, `Accept-Ranges`, and `Content-Length`.

The frontend sends COOP `same-origin` and COEP `require-corp`, enabling threaded cores only in an isolated context. All core, shell, and game resources must therefore be same-origin or send compatible CORP/CORS headers.

## Production requirements

Use a maintained native PostgreSQL service, maintained S3 provider, TLS termination, secret manager, explicit CORS origin, health monitoring, encrypted backups plus restore tests, log retention, resource limits, and a release migration job. Keep debug off, set `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `TRUST_PROXY=true` only behind a trusted proxy, and create a least-privilege storage identity.

Do not expose Django development assets, the object-store API, or an unauthenticated Admin publicly. Review core redistribution licenses and game evidence before publishing any console release.
