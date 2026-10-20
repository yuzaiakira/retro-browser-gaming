# Firefox catalog smoke — 2026-10-20

```bash
cd apps/web
npx playwright install firefox
node -e '...firefox.launch(); goto http://127.0.0.1:13000/; assert Orbit Catch...'
```

```text
{"title":"Rewind — your pocket arcade","hasOrbit":1}
FIREFOX_CATALOG_PASS
```

Screenshot: `docs/test-evidence/PH-02/firefox-catalog.png`.

This proves catalog discovery in Playwright Firefox against the Compose stack. It does **not** prove offline install, OPFS downloads, WASM cores, gamepad, or touch on Firefox.
