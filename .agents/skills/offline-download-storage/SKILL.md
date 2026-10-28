---
name: offline-download-storage
description: Implement and verify Range downloads, OPFS/IndexedDB journals, Web Workers/Locks, integrity, quota/recovery and bounded-memory behavior.
---

# Offline download storage

Use for `apps/web/src/workers/download.worker.ts`, Range code, OPFS/IDB schemas, manifests, and browser download fault tests.

- Preserve strict 206 + `Content-Range` + ETag/version checks, bounded 8 MiB-or-smaller buffers, flush-before-journal ordering, rehash-on-restart, final streaming SHA-256, and Web Lock exclusion.
- Never mark an installation ready before every required asset verifies. Recovery must discard invalid journal chunks and preserve unrelated saves.
- Add scenarios to `apps/web/tests/download-faults.cjs` where possible: truncation, 200/206/416, timeout, crash before journal commit, changed manifest/ETag, quota, pause/cancel/delete, and concurrent tabs.
- 1 GiB proof needs a real browser worker transfer with generated deterministic bytes, observed peak memory, completed hash, and evidence that committed chunks were not fetched again. A range probe is not evidence.
- Treat OPFS/storage API absence honestly as unsupported; do not silently downgrade to whole-file browser memory.

Record exact command, fixture generation, browser version, assertions and limits under Git-ignored `.runtime/test-evidence/` (see `docs/qa-summary.md`) and reconcile the matrix.
