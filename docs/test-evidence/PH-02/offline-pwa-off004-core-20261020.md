# OFF-004 missing emulator-core — 2026-10-20

PDR: `OFF-004 | core asset missing | not falsely ready; recoverable UX`.

## Command

```bash
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  node tests/offline-pwa.cjs
```

## Result

```text
OFF_004_CORE_MISSING_PASS {"deletedPath":"/cores/ejs-4.2.3/cores/genesis_plus_gx-wasm.data","opfsGames":2,...}
OFF_004_CORE_RECOVERY_PASS
```

## Method

1. Catalog-install MIT Genesis Breakout (wasm core cached under `retro-shell-v3`).
2. Go offline; delete **only** `/cores/.../genesis_plus_gx-wasm.data` from Cache Storage.
3. Confirm OPFS game directories remain (`opfsGames > 0`) so this is core-missing, not ROM-missing.
4. Reload play → audit fails closed with missing/reinstall UX.
5. Online reinstall restores the deleted core path and Save state works again.

Prior OPFS-only eviction evidence remains historical; it does **not** satisfy OFF-004 alone.
