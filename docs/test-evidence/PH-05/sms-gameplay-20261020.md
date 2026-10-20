# Master System gameplay — smsplus / Ninja Girl

Date: 2026-10-20

## Fixture

- File: `.fixtures/mit-sms-ninjagirl.sms`
- SHA-256: `9eb439b9aa883d53411ff1785600bb370edc45e10436b96c216502ac162f1c06`
- Source: SMS Power Homebrew `NinjaGirl-SMS-2024-04-09.zip` (`https://www.smspower.org/Homebrew/NinjaGirl-SMS`)
- Upstream: `https://github.com/pw32x/ninjagirl` (MIT) — `LICENSES/ninjagirl-SMS-MIT.txt`

## Command

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/sms-smoke.cjs
```

## Result

```
SMS_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false,"seekableMedia":true,"onDemandMedia":false},"stateBytes":95384,"lit":487618,"beforeHash":1412268963,"movedHash":2394502193,"restoredHash":1481906301,"inputChangedFrame":true,"controlScheme":"segaMS via smsplus","fixture":"mit-sms-ninjagirl.sms"}
```

- Core `smsplus` (EmulatorJS 4.2.3) loaded under COOP/COEP.
- Control scheme forced to `segaMS` via `frame.js`.
- Canvas rendered (non-black), Start/Button1 + D-pad input changed the frame hash, save/load returned a substantial state blob.
- Network set offline after ROM/core load (same pattern as Genesis smoke).

Screenshot: `screenshots/sms-gameplay.png`  
Run log: `sms-gameplay-run-20261020.txt`

## Catalog

`seed_demo --with-console-fixtures` publishes slug `mit-sms-ninjagirl` on console `sega-ms` when the fixture is present in `.fixtures/`.
