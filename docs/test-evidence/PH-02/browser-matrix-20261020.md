# Browser matrix smoke — 2026-10-20

## Command

```bash
npx playwright install firefox webkit
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node tests/browser-matrix-smoke.cjs
```

## Results

| Target | Result |
|---|---|
| Chromium catalog | PASS |
| Playwright Firefox catalog | PASS |
| Playwright Firefox Orbit install + offline library | PASS |
| Playwright WebKit catalog | NOT_VERIFIED — host missing `libicu*.so.66`, `libwebp.so.6`, `libffi.so.7` |
| Physical gamepad / mobile / iOS Safari | NOT_VERIFIED — no hardware attached |

Playwright WebKit is **not** treated as iOS Safari evidence.
