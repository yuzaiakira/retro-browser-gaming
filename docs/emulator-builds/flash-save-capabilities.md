# Flash / Ruffle — save capability audit (PH-12.6)

Date: 2026-11-01.

## Verdict

| Capability | Supported on pinned Ruffle 0.7.1? | Product UI |
|------------|-----------------------------------|------------|
| Libretro / EmulatorJS **save state** (Quick save/load) | **No** — no general VM snapshot API | Hidden (`saveState: false`) |
| Flash **SharedObject** persistence | **Yes** — localStorage keyed by SWF identity | Game-internal progress only |
| First-party checkpoint bridge (ExternalInterface) | **Not enabled** (default deny) | N/A |
| Full AVM serialization export/import | **Not available** | N/A |

**Do not label SharedObject progress as Quick Save / Save State.**

## SharedObject evidence

- Fixture SO name: `rbg_mit_flash_dot_v1`.
- Observed key: `launcher.localhost/runtime/mit-flash-dot.swf/rbg_mit_flash_dot_v1` (Compose) or `127.0.0.1/runtime/…` (local smoke).
- Survives new Chromium page in the same persistent profile.
- Survives Compose offline cold-start (`FLASH_RUFFLE_PROGRESS_PERSISTENCE_PASS`, `FLASH_RUFFLE_OFFLINE_PWA_PASS`).
- Scoped per SWF file name / host path — not a cross-game store by design of Ruffle’s keying.

## Rejection rules

- `exportState` / `importState` throw `Save states unsupported`.
- Corrupt SO blobs are owned by Ruffle; the launcher does not parse or migrate them.
- No claim of physical-gamepad save workflows.

## Acceptance impact

Engineering **VERIFIED_PLAYABLE** is allowed only with this documented semantics (same honesty bar as J2ME RMS vs libretro states). Product approval remains pending.
