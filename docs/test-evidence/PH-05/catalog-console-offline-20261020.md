# Catalog-installed Genesis/PS1/PSP offline cold-start — 2026-10-20

## Command

```bash
# Compose API seeded with --with-console-fixtures; production Next on :3000
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node tests/catalog-console-offline.cjs
```

## Result

```text
CATALOG_INSTALL_PASS genesis
CATALOG_INSTALL_PASS ps1
CATALOG_INSTALL_PASS psp
CATALOG_OFFLINE_PASS genesis
CATALOG_OFFLINE_PASS ps1
CATALOG_OFFLINE_PASS psp
CATALOG_CONSOLE_OFFLINE_PASS
```

Screenshots: `PH-05/screenshots/catalog-offline-{genesis,ps1,psp}.png`.

## Scope

- Real catalog download → OPFS/IDB install → shell/core Cache Storage for MIT Genesis Breakout, MIT PS1 Dot, MIT PSP Dot.
- Fresh Chromium process with `setOffline(true)` before library navigate.
- Offline boot to Save state + Load state restore for each platform.

Interactive paddle/framebuffer input proofs remain in `core-smoke` / `ps1-smoke` / `psp-smoke` / `ondemand-media` evidence. Physical audio and controllers remain `NOT_VERIFIED`.
