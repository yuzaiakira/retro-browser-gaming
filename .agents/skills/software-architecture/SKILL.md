---
name: software-architecture
description: Apply the Retro Browser Gaming clean boundaries, contracts, compatibility, and maintainability rules to cross-cutting design changes.
---

# Software architecture

Use for changes crossing API, downloader, storage, player, emulator, or persisted-data boundaries; read `docs/PDR.md`, `docs/architecture.md`, and affected acceptance rows first.

- Keep Django as owner of catalog, release identity, publishing rights, and manifests. Keep browser OPFS/IDB as owner of installed bytes, journals, saves, and preferences.
- Keep React UI out of worker and EmulatorJS internals. Player code uses `apps/web/src/emulators/contracts.ts` and the frame adapter only.
- Validate API/manifest/input boundaries. Preserve immutable asset keys, release/core/version identity in downloads, installations, and saves.
- Prefer additive compatible schema and storage changes. Explain a required migration/compatibility break before making it.
- Make a short decision record in the relevant docs when a core, storage, or security boundary changes. Do not refactor healthy modules merely to match an abstract pattern.

Before finishing: run affected tests, typecheck, and inspect the dependency direction. Update evidence and `docs/EXECUTION_STATE.md` only for a verified result.
