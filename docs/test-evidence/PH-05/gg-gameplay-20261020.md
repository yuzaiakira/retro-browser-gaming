# Game Gear gameplay — genesis_plus_gx / Waternet

## Fixture

- File: `.fixtures/mit-gg-waternet.gg`
- SHA-256: `ab9f288e2b556263cddd7856deb67269cfe08ac1e6729ca9e44c5e2c19bb1d8c`
- Source: `joyrider3774/waternet` release `v1.0` asset `Waternet.Sega.Game.Gear.zip`
- Upstream: `https://github.com/joyrider3774/waternet` (MIT) — `LICENSES/waternet-GG-MIT.txt`

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/gg-smoke.cjs
```

## Result

```text
GG_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":1036312,"lit":546293,"beforeHash":631188049,"movedHash":3137104232,"restoredHash":3137104232,"inputChangedFrame":true,"controlScheme":"segaGG","fileName":"mit-gg-waternet.gg","canvas":"960x640","display":"960x640","aspect":null,"fixture":"mit-gg-waternet.gg"}
```

- Core `genesis_plus_gx` (EmulatorJS 4.2.3) loaded under COOP/COEP with `.gg` ROM.
- `frame.js` forced `EJS_controlScheme=segaGG` from `.gg` extension (Mega Drive remains `segaMD`).
- Non-black framebuffer after boot; directional input changed frame hash; save state >256 bytes; offline after load.
- EmulatorJS display canvas is player-sized; native 160×144 GG mode is confirmed via `.gg` filename + `segaGG` scheme (internal framebuffer size not separately exposed).

Screenshot: `screenshots/gg-gameplay.png`  
Run log: `gg-gameplay-run-20261020.txt`

## Catalog

`seed_demo --with-console-fixtures` publishes slug `mit-gg-waternet` on console `sega-gg` when the fixture is present in `.fixtures/`.
