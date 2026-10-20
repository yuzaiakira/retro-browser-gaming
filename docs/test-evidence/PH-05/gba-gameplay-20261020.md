# GBA gameplay — mgba / Google Dino

## Fixture

- File: `.fixtures/mit-gba-dino.gba`
- SHA-256: `5942beac698ecee57c4d93da042b37ce632121f3500804cf3679d5edd642663d`
- Source: fritzem/Google-Dino-GBA release 1.0.1 (MIT)

## Core

- mgba from cdn.emulatorjs.org/4.2.3
- Recorded in `docs/core-package-lock.json`

## Command

```bash
PLATFORM=gba CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/libretro-family-smoke.cjs
```

## Result

```text
GBA_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":430168,"lit":614400,"beforeHash":1577554138,"movedHash":3645102400,"restoredHash":3504148394,"inputChangedFrame":true,"controlScheme":"gba","core":"mgba","fixture":"mit-gba-dino.gba","platform":"gba"}
```

Screenshot: `screenshots/gba-gameplay.png`  
Run log: `gba-gameplay-run-20261020.txt`

## Catalog offline

See `catalog-gba-offline-20261020.md`.
