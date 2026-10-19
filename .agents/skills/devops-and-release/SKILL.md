---
name: devops-and-release
description: Maintain reproducible native Compose, CI/release artifacts, Git history, health checks and deployment verification without weakening security.
---

# DevOps and release

Use for `compose.yaml`, Dockerfiles, scripts, CI, environment setup, release archives, Git bundles, checksums, and deployment evidence.

- Preserve the native stack: PostgreSQL, SeaweedFS S3-compatible object storage, Django/Gunicorn, and Next standalone. Use `./scripts/compose.sh`; do not substitute SQLite/PGlite for Compose acceptance.
- Keep proxy/CA handling runtime-scoped and secret-free in images. Do not disable TLS, hard-code environment proxy endpoints, or print `.env` values.
- Validate changes with actual build/start/health, storage/range and browser checks appropriate to scope. Keep logs secret-free.
- Commit focused, tested changes with the configured identity. Before release, require clean status, bundle verification, source archive from the commit, `sha256sum --check`, updated acceptance docs and handover.
- Only claim CI/deploy/GitHub push when actually executed and authorized. Release artifacts must name and contain the committed revision.
