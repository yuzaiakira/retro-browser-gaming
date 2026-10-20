# WonderSwan mednafen_wswan real-core gameplay — 2026-10-20

## Command

```bash
PLATFORM=wswan CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node apps/web/tests/libretro-family-smoke.cjs
```

## Result

```text
WSWAN_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":69664,"lit":592320,"inputChangedFrame":true,"controlScheme":"ws","core":"mednafen_wswan","fixture":"mit-wswan-chips1.wsc","platform":"wswan"}
```

Core lock: 68 files. Screenshot: `screenshots/wswan-gameplay.png`.
