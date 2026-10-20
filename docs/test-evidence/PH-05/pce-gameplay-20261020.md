# PC Engine HuCard gameplay — mednafen_pce / HuC scroll

## Fixture

- File: `.fixtures/huc-pce-scroll.pce`
- SHA-256: `5397d79a9fdeba1c1911d331ed564700f9d3981f62f9984ae289ddb9a8dcf35d`
- Source: BlockoS/huc examples/scroll (GPL-2.0); HuCard only — not CD

## Core

- mednafen_pce from cdn.emulatorjs.org/4.2.3
- Recorded in `docs/core-package-lock.json` (65 files)

## Command

```bash
PLATFORM=pce CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/libretro-family-smoke.cjs
```

## Result

```text
PCE_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":83552,"lit":466440,"beforeHash":3981227456,"movedHash":2921876477,"restoredHash":2097673923,"inputChangedFrame":true,"controlScheme":"pce","core":"mednafen_pce","fixture":"huc-pce-scroll.pce","platform":"pce"}
```

Screenshot: `screenshots/pce-gameplay.png`  
Run log: `pce-gameplay-run-20261020.txt`

## Catalog offline

See `catalog-pce-offline-20261020.md`.
