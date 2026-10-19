# Importing licensed content

Only an operator with local filesystem/CLI access or an authenticated Django administrator can write content. Never import a commercial ROM/BIOS merely because someone owns a copy. Distribution rights must be independently established for every asset and core.

1. Create the console and pinned core metadata in Admin. WASM cores cannot be `available` without a licensed package manifest. Research status is not proof of runtime support.
2. Place a JSON manifest alongside regular asset files. Paths cannot contain directories/traversal, symlinks, archives, duplicate filenames or remote fetch instructions. Each file requires its actual SHA-256 and positive byte size.
3. Use `python manage.py import_manifest /absolute/path/manifest.json --dry-run`. This validates bytes and database constraints inside a rolled-back transaction and never uploads objects.
4. Use the same command without dry-run to ingest pending assets. Only after reviewing distribution rights, use `--approve-distribution`; use `--publish` only when the complete bundle/profile is ready.

Run commands inside the API container after explicitly mounting the operator's input directory read-only, or in a correctly configured local Django environment. Nothing automatically scans the user's filesystem.

Schema version 1 top-level keys: `schemaVersion`, `game` (`slug`, `title`, `description`, `genre`), `console` (slug), `core` (`code`, `version`), `revision`, `entryFile`, `assets`.
Each asset requires: `file`, `kind`, `contentType`, `sha256`, `byteSize`, `version`, `provenance` (HTTPS), `license`, `distributionEvidence`, `sourceType` (`first-party`, `upstream`, `permission`). Kinds are rom/disk/html_bundle/bios/artwork/patch. The importer creates a required-files list and records BIOS asset IDs separately.

Changing immutable content requires a new release revision/asset version. Exact repeated imports are idempotent. The seed command is an executable example of constructing this schema with real computed bytes/hash, not sample placeholder hashes.

Object writes and SQL transactions cannot commit atomically. An import that fails after upload may leave a private orphan object; it does not publish a DB record. Do not delete blobs automatically because they may be shared. Operator-reviewed orphan cleanup and robust restoration of lost stored objects remain outstanding. Signed links already issued before a rights revocation expire after at most 15 minutes.
