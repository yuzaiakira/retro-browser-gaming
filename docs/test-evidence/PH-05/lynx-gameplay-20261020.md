# Atari Lynx handy real-core gameplay — 2026-10-20

## Command

```bash
PLATFORM=lynx CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/libretro-family-smoke.cjs
```

## Result

```text
LYNX_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":false,"onDemandMedia":false},"stateBytes":134448,"lit":587520,"inputChangedFrame":true,"menuChangedFrame":true,"controlScheme":"lynx","core":"handy","fixture":"mit-lynx-dot.lnx","platform":"lynx"}
```

- Fixture: first-party MIT Lynx Dot (cc65); sources `fixtures/lynx-dot/`; SHA-256 `55565eea9522ef738520bb8e71542eb89a3ad7709f4a7c06b75bce250301ad8c`.
- Optional `lynxboot.img` BIOS **not** redistributed; handy runs this homebrew without it.
- Screenshot: `screenshots/lynx-gameplay.png`.
