# J2ME MIT Dot — interactive Chromium gameplay + offline RMS — 2026-10-21

## Runtime

- Self-hosted **js2me** (MIT, commit `828b81b468953c34bb754b59e67c1021754e8bdb`) under `apps/web/public/cores/js2me/`
- Isolated frame: `/runtime/j2me-frame.html` + IndexedDB RMS bridge (`/runtime/j2me-rms-idb.js`)
- First-party MIT MIDlet: `.fixtures/mit-j2me-dot.jar` (sources `fixtures/j2me-dot/`)

SHA-256 jar: `63afd7fa5a851eec7e64ea25e49d36a5239a8c935cbb80600851c10fed2a50e2`

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-js2me-smoke.cjs
```

## Result

```text
J2ME_GAMEPLAY_PASS {"capabilities":{"saveState":false,"audio":false,"analog":false,"seekableMedia":false,"onDemandMedia":false,"j2meRuntime":"js2me","rms":true,"midletId":"Retro Browser Gaming/MIT J2ME Dot/63afd7fa5a851eec","screen":{"width":240,"height":320}},"lit":101751,"inputChangedFrame":true,"pass1Score":3,"pass2Score":3,"midletId":"Retro Browser Gaming/MIT J2ME Dot/63afd7fa5a851eec","offlineBeforeNavigation":true,"originServerStopped":true,"controlScheme":"j2me-keypad","core":"js2me","fixture":"mit-j2me-dot.jar","platform":"j2me"}
```

## Verified behaviours

1. Real JAR bytecode executed by js2me (not a JS game clone).
2. LCDUI Canvas frames rendered (`lit=101751`).
3. Keypad / libretro-mapped fire changed the frame and wrote score via MIDP RecordStore.
4. Durable IndexedDB flush (`pass1Score=3`).
5. Fresh Chromium persistent profile; origin server stopped; offline navigation via cached-asset routes; `pass2Score=3` identical.

Screenshots: `PH-06/screenshots/j2me-dot-gameplay.png`, `PH-06/screenshots/j2me-dot-offline-restore.png`.

## Compatibility caveat

Matrix row is VERIFIED_PLAYABLE for this first-party MIDlet subset only. js2me implements a partial CLDC/MIDP surface; arbitrary commercial JARs are unsupported. Sound not verified. Track feature gaps separately.
