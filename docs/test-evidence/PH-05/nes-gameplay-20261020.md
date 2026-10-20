# NES gameplay — fceumm / Table Tennis

## Fixture

- File: `.fixtures/mit-nes-table-tennis.nes`
- SHA-256: `05122457672f95fcf2ee518c3f37e506617725c2d031100b1b1c8b7785068ea3`
- Source: `mike42/8bit-table-tennis` release `v1.0` asset `table_tennis_v1.0.nes`
- Upstream: `https://github.com/mike42/8bit-table-tennis` (MIT) — `LICENSES/table-tennis-NES-MIT.txt`

## Core

- `fceumm-wasm.data` / `fceumm-legacy-wasm.data` / `reports/fceumm.json` from `cdn.emulatorjs.org/4.2.3`
- Recorded in `docs/core-package-lock.json` (50 files; `scripts/verify-core-lock.py` OK)

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/nes-smoke.cjs
```

## Result

```text
NES_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":13752,"lit":49423,"beforeHash":131500636,"movedHash":3270998626,"restoredHash":3270998626,"inputChangedFrame":true,"controlScheme":"nes","fixture":"mit-nes-table-tennis.nes"}
```

- Core `fceumm` loaded under COOP/COEP with `EJS_controlScheme=nes`.
- Non-black framebuffer; directional input changed frame hash; save state >256 bytes; offline after load.

Screenshot: `screenshots/nes-gameplay.png`  
Run log: `nes-gameplay-run-20261020.txt`

## Catalog

`seed_demo --with-console-fixtures` publishes slug `mit-nes-table-tennis` on console `nes` when the fixture is present in `.fixtures/`.
