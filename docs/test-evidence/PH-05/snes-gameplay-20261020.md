# SNES gameplay — snes9x / Gothicvania

## Fixture

- File: `.fixtures/mit-snes-gothicvania.sfc`
- SHA-256: `11d32045c69839309490676fe2dd46e3385806f79c8dad279c2d1f4ffa6027df`
- Source: donth77/snes-homebrew release v1.0.0 gothicvania.sfc (MIT)

## Core

- snes9x from cdn.emulatorjs.org/4.2.3
- Recorded in `docs/core-package-lock.json`

## Command

```bash
PLATFORM=snes CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/libretro-family-smoke.cjs
```

## Result

```text
SNES_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":823432,"lit":321931,"beforeHash":2333514137,"movedHash":830507050,"restoredHash":2460689954,"inputChangedFrame":true,"controlScheme":"snes","core":"snes9x","fixture":"mit-snes-gothicvania.sfc","platform":"snes"}
```

Screenshot: `screenshots/snes-gameplay.png`  
Run log: `snes-gameplay-run-20261020.txt`

## Catalog offline

See `catalog-snes-offline-20261020.md`.
