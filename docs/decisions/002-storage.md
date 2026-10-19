# ADR 002: immutable artifacts and fail-closed publication
Use PostgreSQL and an S3-compatible development store. Do not replace S3 integration evidence with mocked SDK calls. OPFS + IndexedDB is the planned browser storage. Close a chunk file before committing its journal entry; reconcile and hash prior chunks after interruptions. Use Web Locks to prevent multiple writers. Full-file integrity is required before installation. Save namespaces are independent of ROM deletion.

SQLite may exercise backend policy in this restricted environment, but does not prove PostgreSQL concurrency or migrations. Local file storage may exercise import/HTTP Range, but does not prove S3 compatibility. Such evidence must remain separately labeled.
