# Neo Geo Pocket Color mednafen_ngp real-core gameplay — 2026-10-20

## Command

```bash
PLATFORM=ngpc CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/libretro-family-smoke.cjs
```

## Result

```text
NGPC_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":false,"onDemandMedia":false},"stateBytes":31768,"lit":432505,"inputChangedFrame":true,"menuChangedFrame":true,"controlScheme":"ngp","core":"mednafen_ngp","fixture":"gpl-ngpc-test.ngp","platform":"ngpc"}
```

- Fixture: GPL-3.0 NGPC-Code `test/test.ngp` (Color catalog identity, distinct from NGP joypad); SHA-256 `d6e6c4d85e6f029b11bafbb6077ff30942daf940de0b61fde17c86904797dbf1`.
- Same pinned `mednafen_ngp` core; separate slug/console and independent smoke + catalog offline.
- Screenshot: `screenshots/ngpc-gameplay.png` (“Hello, World! / From Anthony!”).
