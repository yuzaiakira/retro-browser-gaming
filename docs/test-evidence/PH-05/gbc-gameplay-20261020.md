# Game Boy Color gameplay — gambatte / Waternet

## Fixture

- File: `.fixtures/mit-gbc-waternet.gbc`
- SHA-256: `76bfa37e0db237d5d50a3084fca9a876592aaabfd6a9533adadd2d356998423d`
- Source: joyrider3774/waternet v1.0 Waternet.Nintendo.Game.Boy.Color.zip (MIT)

## Core

- gambatte from cdn.emulatorjs.org/4.2.3 (distinct .gbc fixture from GB)
- Recorded in `docs/core-package-lock.json`

## Command

```bash
PLATFORM=gbc CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/libretro-family-smoke.cjs
```

## Result

```text
GBC_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":59632,"lit":455040,"beforeHash":2689188423,"movedHash":1962512101,"restoredHash":2689188423,"inputChangedFrame":true,"controlScheme":"gb","core":"gambatte","fixture":"mit-gbc-waternet.gbc","platform":"gbc"}
```

Screenshot: `screenshots/gbc-gameplay.png`  
Run log: `gbc-gameplay-run-20261020.txt`

## Catalog offline

See `catalog-gbc-offline-20261020.md`.
