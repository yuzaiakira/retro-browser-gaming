# MIT Genesis Pong — catalog install + offline cold-start — 2026-10-21

## Verdict

**PASSED** — Catalog download to `ready-offline`, keyboard input on player, save state, fresh-process offline cold-start with load.

## Command

```bash
RETRO_TEST_BASE_URL=http://launcher.localhost:13000 \
CATALOG_OFFLINE_ONLY=genesis-pong \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/catalog-console-offline.cjs
```

## Result

```
CATALOG_CONSOLE_OFFLINE_PASS {"genesis-pongInstall":true,"genesis-pongOffline":true}
```

Screenshot: `screenshots/catalog-offline-genesis-pong.png`.

## Related

- Core gameplay: `genesis-pong-gameplay-20261021.md`
- Seed: `seed-genesis-pong-20261021.txt` (slug `mit-genesis-pong`)
