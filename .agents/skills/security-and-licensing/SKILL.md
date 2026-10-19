---
name: security-and-licensing
description: Protect Retro Browser Gaming assets, secrets, browser isolation, APIs, dependencies and distribution rights.
---

# Security and licensing

Use for assets/fixtures, importer/API changes, headers/CORS, service workers, dependencies, release packaging, or security-sensitive tests.

- Distribute only first-party or legally redistributable assets. Record source URL/repository, version/commit, license, build commands and SHA-256 in `docs/licenses-and-assets.md`; never add commercial ROMs, BIOS files, proprietary SDKs, or unaudited binaries.
- Keep TLS verification, manifest checks, S3 credential isolation, path validation, iframe sandboxing, COOP/COEP, CSP/CORS boundaries, and same-origin postMessage validation intact.
- Never print or commit secrets, `.env`, proxy endpoints/certificates, presigned URLs, access keys, or production identifiers. Use existing Compose environment boundaries.
- Lock and review dependency/core byte changes. Run `python3 scripts/verify-core-lock.py` after any vendored core change and preserve notices.

Security tests must attempt the actual boundary; do not claim hardening from configuration inspection alone.
