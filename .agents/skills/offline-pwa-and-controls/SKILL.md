---
name: offline-pwa-and-controls
description: Verify PWA caching, offline launch/recovery, saves, keyboard/gamepad/touch controls and browser lifecycle behavior.
---

# Offline PWA and controls

Use for `apps/web/public/sw.js`, offline feature code, input router, settings/touch layout, Player saves, and browser compatibility tests.

- Cache only shell/core runtime resources; game bytes remain in OPFS. Offline launch must not fetch Django, S3, or CDN.
- Test complete browser close/reopen offline, console save/load, service-worker upgrade, missing/evicted core recovery, and preservation of valid games/saves.
- Exercise keyboard, Gamepad API mapping, touch customization, orientation, fullscreen, blur/visibility/disconnect release behavior. Clearly label browser simulation versus physical hardware.
- Run Chromium plus Firefox/WebKit when installed; retain unsupported/unavailable results as `NOT_VERIFIED`, never inferred pass.

Use real installed games and emulator frames where the PDR requests console evidence; HTML5-only evidence does not close console gates.
