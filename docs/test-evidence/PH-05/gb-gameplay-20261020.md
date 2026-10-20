# Game Boy gameplay — gambatte / Dot

## Fixture

- File: `.fixtures/mit-gb-dot.gb`
- SHA-256: `3d37551b0b313de84cc5467e794ebd675589c50d19a8179b76211b3534632330`
- Source: First-party GBDK 4.3.0 build; fixtures/gb-dot/ (MIT)

## Core

- gambatte from cdn.emulatorjs.org/4.2.3
- Recorded in `docs/core-package-lock.json`

## Command

```bash
PLATFORM=gb CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/libretro-family-smoke.cjs
```

## Result

```text
GB_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":26864,"lit":255591,"beforeHash":2436582275,"movedHash":3519148090,"restoredHash":2436582275,"inputChangedFrame":true,"controlScheme":"gb","core":"gambatte","fixture":"mit-gb-dot.gb","platform":"gb"}
```

Screenshot: `screenshots/gb-gameplay.png`  
Run log: `gb-gameplay-run-20261020.txt`

## Catalog offline

See `catalog-gb-offline-20261020.md`.
