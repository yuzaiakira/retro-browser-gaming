# Project goal

Deliver a reliable, production-quality browser-based retro gaming launcher using Django + DRF, PostgreSQL, Next.js + TypeScript, PWA service workers, WebAssembly emulator cores, S3-compatible object storage, OPFS + IndexedDB, and Docker Compose.

Users can browse and search legally distributed games, understand compatibility, download with pause/resume/integrity/recovery, install into browser-managed storage, play online or completely offline, use keyboard/mouse where supported/physical controllers/customizable touch controls, save and restore progress, and manage their library, storage, downloads, and preferences on supported desktop and mobile browsers.

Sega, PS1, and PSP are P0 consoles. PS2 is experimental and cannot block release. Console integrations use modular emulator adapters so browser-compatible systems can be added without coupling catalog, download, or player code to a core implementation.

The PDR defines the exact mandatory scope and acceptance gates. The final release is functional, tested with real evidence, documented, reproducible, secure, licensed for distribution, and maintainable; this document adds no requirements beyond that scope.
