# Compose clean rebuild verification

Date: 2026-11-02  
Branch: `feat/platform-expansion-phase-1`

## BuildKit root cause

Compose declared:

```yaml
secrets:
  proxy_ca:
    file: ${CODEX_PROXY_CERT:-/dev/null}
```

When `CODEX_PROXY_CERT` is unset, BuildKit treated `/dev/null` (a **character device**) as the secret file source. Docker Buildx 0.37 / Engine 29.8 refuses that without:

`additional privileges requested: pass "--allow=fs.read=/dev/null"`

Dockerfiles already mount the secret as `required=false` and only enable `NODE_EXTRA_CA_CERTS` / `PIP_CERT` when the file is non-empty (`[ -s ... ]`). The secret is optional; `/dev/null` was an invalid portable placeholder.

## Fix

1. Add regular empty file `infra/docker/empty-proxy-ca.pem` (0 bytes).
2. Default Compose secret to that file: `${CODEX_PROXY_CERT:-./infra/docker/empty-proxy-ca.pem}`.
3. `scripts/compose.sh` ensures the placeholder exists and rejects a non-file `CODEX_PROXY_CERT`.

No credentials are injected. Empty secret → no CA export in image build layers.

## Clean rebuild evidence

| Step | Result |
|------|--------|
| `./scripts/compose.sh build api web` | Images built without `/dev/null` allow flag |
| `up -d --force-recreate api web edge` | Healthy |
| Web mounts | `/private-runtime`, allowlist JSON only — **no** host `.next` bind |
| Image contains `mame_rbg_arcade` client registry | Yes |
| Image contains runtime frames / CSP probe | Yes |
| Core sync LOCAL_FULL | `PRIVATE_CORE_SYNC_OK` |
| Core lock | `CORE_LOCK_OK` checked=397 |

Marker: **`COMPOSE_CLEAN_REBUILD_PASS`**  
Evidence: `.runtime/test-evidence/PH-12/soak/COMPOSE_CLEAN_REBUILD_PASS.txt`, `regressions/web-clean-build.log`, `compose-clean-build.log`.

## Tooling versions (local)

- Docker Engine 29.8.2  
- Docker Compose 5.6.0  
- Buildx 0.37.2 (docker driver)
