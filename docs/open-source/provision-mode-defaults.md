# Core provision mode defaults

| Context | Default | How to change |
| --- | --- | --- |
| `compose.yaml` / production image | **PUBLIC_BROWSER** | Must stay PUBLIC_BROWSER for public deploys |
| Local developer full cores | Opt-in **LOCAL_FULL** | `compose.override.yaml` (see `compose.override.example.yaml`) or `.env` |
| `scripts/web-entrypoint.sh` | PUBLIC_BROWSER | Env override |
| `scripts/provision-private-cores.py` | PUBLIC_BROWSER when unset | `--mode LOCAL_FULL` for local |

Invalid modes fail closed. Missing private asset directory fails sync unless `RBG_SYNC_ALLOW_EMPTY_PRIVATE=1` (source-only shells).

`LOCAL_FULL` additionally requires `RBG_ALLOW_LOCAL_FULL=1` (set only in local override / explicit break-glass). Production compose must not set that flag.
