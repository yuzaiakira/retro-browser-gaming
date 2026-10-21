# J2ME / js2me compatibility table

This table tracks **tested** first-party MIDlets only. Success of one title does **not** imply support for other JARs.

Runtime: self-hosted MIT **js2me** (`apps/web/public/cores/js2me/`, commit in `SOURCE_COMMIT.txt`) via `/runtime/j2me-frame.html`.

## Tested MIDlets

| MIDlet | JAR SHA-256 (prefix) | Canvas | Form/LCDUI | Keypad | Soft keys | RMS/IDB | Offline restore | Sound | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MIT J2ME Dot | `63afd7fa…` | V | — | V | — | V | V | — | Frame smoke + **catalog offline** (`PH-06/catalog-j2me-offline-20261021.md`) |
| MIT J2ME Paddle | `51c0c9d9…` | V | — | V | — | V | V | — | Frame + **catalog offline** |
| MIT J2ME Notes | `cbefc732…` | — | V | — | V | V | V | — | Frame + **catalog offline** |

Legend: `V` verified in Chromium evidence for that MIDlet, `—` not exercised.

Security: production allowlist has no bypass; residual same-origin iframe risk documented in `docs/j2me-security-architecture.md`. Dedicated-origin isolation PoC + RMS migration tested but **not** production-switched (`PH-06/j2me-isolated-origin-poc-20261021.md`).

## Implemented MIDP/CLDC subset (practical)

- CLDC-ish: `Object`, primitives wrappers, `String`/`StringBuffer`/`StringBuilder`, `Thread`, collections subset used by js2me.
- MIDP LCDUI: `Display`, `Displayable`, `Canvas`, `Graphics`, `Form`/`Screen`/`Item`/`TextField`/`StringItem`, `Command`/`CommandListener`, `Image` (partial).
- RMS: `RecordStore` open/create/close/add/set/get with IndexedDB durable flush (cooperative suspend).
- Input: numeric keypad, game actions, soft keys (LSK/RSK), keyboard remap hooks.

## Explicitly unsupported / unverified

- M3G / JSR-184 (classes present upstream; **not** claimed).
- Generic `Connector` networking (HTTP/socket) — **disabled** by security layer.
- FileConnection / MMS / SMS / proprietary Nokia APIs — not verified for production use.
- Arbitrary commercial JARs — blocked by allowlist until isolation review expands.
- Audio playback — not verified.
- Full MIDP 2.0 GameCanvas / Sprite / TiledLayer suite — partial upstream, not fixture-proven.

## Screen profiles

Configurable in-frame: `128x160`, `176x220`, `240x320`, `320x240` via `screenProfile` init / `setScreenProfile` command.
