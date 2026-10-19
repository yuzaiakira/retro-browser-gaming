---
name: django-backend
description: Safely evolve the Django/DRF catalog, rights-checked importer, PostgreSQL/S3 storage, manifests, and backend tests.
---

# Django backend

Use for `apps/api/`, catalog/importer/storage, manifest or range APIs, migrations, and Django tests.

- Inspect `apps/api/modules/`, serializers/views, model constraints, and `apps/api/tests/` before editing. Django owns publishability and validates local bundle hashes before storage upload; it must never fetch arbitrary remote assets.
- Preserve immutable release/asset identifiers and strict range semantics. Use transactions for multi-record publication and validate permissions/paths/content types at the boundary.
- Keep PostgreSQL and S3-compatible behavior real. SQLite is only local convenience, never native Compose acceptance.
- Run the focused Django suite, then `ruff check apps/api` and migration drift checks. For stack changes, use `./scripts/compose.sh` and record only secret-free output.
- New legal fixture metadata must include provenance, distribution evidence, license and SHA-256; reject incomplete bundles in tests.

Acceptance requires actual API/storage behavior, not serializer mocks. Update the matrix/evidence only after the command and result are recorded.
