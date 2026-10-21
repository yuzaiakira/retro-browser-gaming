# J2ME Paddle + Notes — independent offline RMS restore — 2026-10-21

Each MIDlet was exercised alone: install path via frame init, Chromium interact, RMS write, dispose, persistent profile relaunch with **origin HTTP server stopped** and `setOffline(true)` before navigation, then exact state compare. Cross-suite store names must not appear in the active midlet snapshot.

## Command

```bash
CHROMIUM_EXECUTABLE=/usr/bin/chromium node apps/web/tests/j2me-offline-paddle-notes.cjs
```

```text
J2ME_OFFLINE_PADDLE_NOTES_PASS {"paddle":{"midletId":"Retro Browser Gaming/MIT J2ME Paddle/1.0.0","pass1State":{"high":2},"pass2State":{"high":2},"offline":true},"notes":{"midletId":"Retro Browser Gaming/MIT J2ME Notes/1.0.0","pass1State":{"note":"offline-note-42"},"pass2State":{"note":"offline-note-42"},"offline":true},"originServerStopped":true}
```

Screenshots: `PH-06/screenshots/j2me-paddle-offline-restore.png`, `PH-06/screenshots/j2me-notes-offline-restore.png`.

Run log: `PH-06/j2me-offline-paddle-notes-run-20261021.txt`.
