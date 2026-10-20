# Physical acceptance environment preparation

Prepared 2026-10-20 on workstation `CodeLab`. Security settings (COOP/COEP, TLS verification) are not weakened for testing.

## Device discovery (this workstation)

| Resource | Result (updated 2026-10-20) |
|---|---|
| Android / `adb` | **Available** — `/usr/bin/adb`; authorized USB device (`2303CRA44A`, Android 15, Chrome 155). See `android-device-discovery-20261020.md`. |
| iOS / `idevice_id` | **No device** — `ERROR: Unable to retrieve device list!` |
| Physical gamepad (`/dev/input/js*`) | **None** — only keyboard/mouse HID |
| Audio sinks | PipeWire: HDMI + **C-Media USB Audio** present; phone speakers for AUD-001 |
| Chromium / Firefox | Installed |
| Playwright WebKit | Via `retro-webkit-test` container only |

## Android (when a phone is attached)

Prefer a **trusted HTTPS** origin (deployed TLS host) or USB reverse to the host Compose stack without disabling COOP/COEP.

```bash
# Install platform-tools if needed, then:
adb devices -l
# Forward device localhost:13000 → host Compose web (and API if needed)
adb reverse tcp:13000 tcp:13000
adb reverse tcp:18000 tcp:18000
# On device Chrome open:
#   http://127.0.0.1:13000/
# Validate Diagnostics: secure context, OPFS, locks, COOP/COEP isolation.
```

If Chrome treats `http://127.0.0.1` oddly on some Android builds, use a LAN HTTPS reverse proxy with a trusted/dev CA installed on the device — do **not** disable isolation headers.

## Gamepad (when a controller is attached)

1. Confirm `/dev/input/js0` (or similar) appears after plug-in.
2. Open Chromium → `/diagnostics` → `gamepad: Available`.
3. Play MIT Genesis Breakout; press D-pad/face buttons; observe in-game response.
4. Unplug mid-hold; confirm no stuck input (IN-002-D).

## Audio (USB headphones/speakers attached)

1. Select the C-Media (or HDMI) sink in the OS mixer.
2. Play Genesis/PS1/PSP; raise in-player Volume after a click (user gesture).
3. Human observer records whether sound is audible (`AUD-001`).

Automated helper (AudioContext state only — **not** audible proof):

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium RETRO_TEST_BASE_URL=http://127.0.0.1:13000 \
  node apps/web/tests/audio-gesture.cjs
```

## iOS Safari

Requires a real iPhone/iPad (or authorized cloud device farm). Playwright WebKit **must not** be used as IOS-001 evidence.

Suggested flow: TestFlight/HTTPS deploy → Safari → Diagnostics → Orbit install → offline library → note PSP SAB limits.
