# Real S3-compatible integration evidence

Date: 2026-10-18. Provider: Garage 2.4.1 official static executable, single-node LMDB development mode. This is a real S3-compatible service, not an in-memory mock.

The following command was executed with Garage and Django in the same shell process so its localhost listener remained reachable:

```bash
./with-s3.sh bash -lc 'cd /workspace/.../retro-browser-gaming-continued; \
  DJANGO_SECRET_KEY=... DJANGO_DEBUG=true DATABASE_URL=sqlite:////.../s3.sqlite3 \
  STORAGE_BACKEND=s3 S3_PUBLIC_ENDPOINT_URL=http://127.0.0.1:9000 \
  .venv/bin/python apps/api/manage.py migrate --noinput && \
  .venv/bin/python apps/api/manage.py init_storage && \
  .venv/bin/python apps/api/manage.py seed_demo --safe-assets-only && \
  .venv/bin/python apps/api/manage.py verify_storage'
```

Observed output: `Development bucket ready; no anonymous read policy installed.` followed by a seeded bundle and `{"status": "PASS", "probe": "real S3 Range", "bytes": 1048576}`.

Independent Garage probe checks passed: 2 MiB PUT, HEAD size + `sha256` metadata, presigned GET `206`, exact range bytes, CORS GET and CORS preflight. Garage was configured with lowercase CORS allowed headers `range` and `if-range`; uppercase variants were rejected by this tested Garage release.

This does not pass G01: native PostgreSQL and Docker Compose still require a capable host.
