# Phase PH-01 — Backend foundations
Date: 2026-10-18. Implementation commit: e84b7e9. Branch: main.

## Plan and implementation
Implemented validated catalog/core/release/asset/license/profile/report models, immutable identities, migrations, authenticated Admin and public read-only APIs, OpenAPI/types, local import/dry-run/approval, S3 adapter and a separate development local transport. Before: no API. After: seeded catalog and manifest served by real HTTP with computed hashes, rights revocation preventing public access.

Decisions: inspect local bytes rather than fetch arbitrary remote URLs; content-addressed storage; revalidate publication graph to fail closed after revocation; keep SQLite/local evidence separate from PostgreSQL/S3.

## Tests
27 Django tests PASS; Ruff PASS; schema and generated TS PASS; local migration rollback/reapply PASS; actual HTTP/socket Range bytes and hash PASS; deploy configuration check PASS. See test-evidence/PH-01. These results do not imply Docker, PostgreSQL, S3 or browser readiness.

## Failures and corrections
Initial lint findings corrected. Asset key uniqueness changed to allow immutable content sharing; migration 0002 added and drift fixed. Missing stored content now causes manifest 503 rather than issuing a misleading URL. First setup attempt for pgserver lacked a parent directory; retried after creating it, then failed on system user creation. MinIO binary URLs returned 410; source-build alternative supplied but untested.

## Gate verdict
G01 BLOCKED_EXTERNAL. Required container/DB/object-store integration is not verified. No test skips were used to hide this.

## Next phase
PH-02 must not start until actual G01 acceptance passes on a capable host. See final-handover.md for exact continuation sequence.
