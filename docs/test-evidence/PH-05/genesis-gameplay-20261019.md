# Genesis gameplay runtime evidence — 2026-10-19

## Fixture and execution

`mit-genesis-breakout.bin` is the tracked MIT-licensed Breakout homebrew fixture documented in `docs/licenses-and-assets.md`. Chromium 154 loaded it through the vendored Genesis Plus GX EmulatorJS core.

```bash
cd apps/web
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
GENESIS_FIXTURE=mit-genesis-breakout.bin \
node tests/core-smoke.cjs
```

## Assertions that passed

```text
GENESIS_GAMEPLAY_PASS {"capabilities":{"saveState":true,"audio":true,"analog":false},"stateBytes":1036312,"before":490.5,"moved":93.5,"restored":490.5}
```

The test starts from the real Breakout title screen, enters the rendered game board, finds the green paddle in the rendered framebuffer, holds the actual Genesis Left command, and requires the paddle to move left by more than 12 pixels. It exports a 1,036,312-byte core save state, then reloads it and requires the paddle position to return within three pixels. The browser network is disabled after the ROM and core have loaded, before starting the game; the input, gameplay, save, and restore assertions still pass. The resulting frame is `screenshots/genesis-gameplay.png`.

This is runtime offline evidence after all required resources have loaded. It is not evidence of an installed Genesis catalog release surviving a browser restart, and headless Chromium does not provide physical audio-output evidence.
