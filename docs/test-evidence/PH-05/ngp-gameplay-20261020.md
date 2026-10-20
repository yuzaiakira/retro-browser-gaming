# Neo Geo Pocket mednafen_ngp real-core gameplay — 2026-10-20

## Command

```bash
PLATFORM=ngp CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/libretro-family-smoke.cjs
```

## Result

```text
NGP_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":false,"onDemandMedia":false},"stateBytes":31768,"lit":4768,"inputChangedFrame":true,"menuChangedFrame":true,"controlScheme":"ngp","core":"mednafen_ngp","fixture":"gpl-ngp-joypad.ngp","platform":"ngp"}
```

- Fixture: GPL-3.0 NGPC-Code `joypad/joypad.ngp` (monochrome NGP catalog identity); SHA-256 `e6a68881e42a50419063b78f3bd7bdc7aa5eda35503df9f74f3a9655fe1cf442`.
- Verified **independently** of Neo Geo Pocket Color — do not inherit NGPC evidence.
- Screenshot: `screenshots/ngp-gameplay.png` (joypad counter display).
