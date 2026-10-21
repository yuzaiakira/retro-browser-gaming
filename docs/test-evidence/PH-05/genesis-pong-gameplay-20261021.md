# MIT Genesis Pong — core gameplay — 2026-10-21

## Verdict

**PASSED** — Interactive Chromium gameplay with `genesis_plus_gx`, offline after ROM load, left paddle input, and save/load restore.

## Fixture

| Field | Value |
| --- | --- |
| Path | `.fixtures/mit-genesis-pong.bin` |
| SHA-256 | `4f077c764972b23c6f2ea6056ebc3b8bf1da972d95f400259de676f787f1061d` |
| License | MIT (`LICENSES/retro-homebrew-games-MIT.txt`) |
| Provenance | `monteslu/retro-homebrew-games` release `build-27` |

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
GENESIS_FIXTURE=mit-genesis-pong.bin \
  node apps/web/tests/core-smoke.cjs
```

## Result

See `genesis-pong-gameplay-run-20261021.txt` and `screenshots/genesis-pong-gameplay.png`.

Catalog seed: `seed_demo --with-console-fixtures` → slug `mit-genesis-pong` (`seed-genesis-pong-20261021.txt`).
