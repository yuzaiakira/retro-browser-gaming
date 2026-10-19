# Failures / limitations
- Initial lint: long strings/import ordering. Fixed and final Ruff run passed.
- Migration drift after removing globally unique object key: fixed with migration 0002; final drift and rollback/reapply checks passed.
- G01 infrastructure: Docker executable and socket absent; system-package setup denied setgroups/seteuid. pgserver could not create its runtime user. Expected real PostgreSQL/S3/container health; actual no services. BLOCKED_EXTERNAL, no fix possible with current permissions.
- MinIO binary endpoint and dated archive returned HTTP 410. Source-build alternative is checked in but NOT_VERIFIED.
- No frontend or emulator failures are concealed: those phases were not started and their tests are unexecuted.
