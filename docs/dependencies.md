# Dependency decisions

Backend uses Django 5.2.18 LTS, DRF 3.16.1, drf-spectacular 0.28.0, psycopg 3.2.10, dj-database-url 3.0.1, boto3 1.40.57 and Gunicorn 23.0.0. Exact transitive versions with wheel hashes are in apps/api/requirements.lock; dev tools in requirements-dev.lock. Installation was synchronized to the dev lock before the final local tests.

Contracts use openapi-typescript 7.10.1 and TypeScript 5.9.3, locked with npm package-lock.json. No Next.js dependency was added before its phase gate.

EmulatorJS candidate v4.2.3 resolves to e150dc0491ae747028919fb82d6598954976ede6. No core artifact hash is invented: binaries were not accepted or tested. Official mapping/options references are in ADR 001. PSP threads/large-disc loading remain unresolved.

Container base tags are explicitly versioned but unverified in this environment. They are not digest-attested release artifacts. MinIO source commit: 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a. Runtime dependency audits and browser/core selection remain outstanding.
