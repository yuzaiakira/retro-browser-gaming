# Dreamcast CHD + interactive disc-swap

Date: 2026-11-02 (Compose offline + clean soak closed 2026-11-03). Branch: `feat/platform-expansion-phase-1`.

## Verdict

| Capability | Status | Marker |
|---|---|---|
| CHD gameplay | **PASS** | `DREAMCAST_CHD_GAMEPLAY_PASS` |
| CHD bounded-memory | **PASS** | `DREAMCAST_CHD_BOUNDED_MEMORY_PASS` |
| CHD save/restore (frame) | **PASS** | `DREAMCAST_CHD_SAVE_RESTORE_PASS` |
| CHD offline PWA (Compose) | **PASS** | `DREAMCAST_CHD_OFFLINE_PWA_PASS` (+ `DREAMCAST_CHD_CLEAN_BUILD_PASS`) |
| Interactive disc-swap | **PASS** | `DREAMCAST_DISC_SWAP_INTERACTIVE_PASS` |
| Clean-build 10-platform soak | **PASS** | `CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS` (10/10, `SOAK_CYCLES=2`) |

Dreamcast remains **VERIFIED_PLAYABLE (engineering)** for ELF/GDI/CDI/CHD. OS-level PWA / physical devices **NOT_VERIFIED**. Product approval **pending**.

## 1. CHD stub root causes

**Wrong prior assumption:** `chdstream_*` soft-stubs block CHD.

**Actual path (pinned Flycast WASM):**

`imgread` → `CHDDisc::tryOpen` → `chd_open_file` / libchdr → hostfs File callbacks → Emscripten FS → BlobFS/SAB → OPFS.

| Item | Finding |
|---|---|
| `chdstream_*` | Soft-stubbed in packaged JS; **RetroArch helpers only** — not on Flycast CHD open path |
| libchdr | Fully linked (`libchdr-static.a` + lzma/zstd/zlib) in `build-prod.sh` |
| Compression | cdlz / cdzl / cdfl present in chdman 0.289 createcd output |
| Seekable reads | BlobFS on-demand works for single-file CHD (`bytesWritten=0`) |
| Rebuild needed for CHD? | **No** — existing pack already plays CHD |

## 2. Build / linkage / catalog changes (Compose unblock)

- No wasm rebuild. Packaged `core.json` gained `m3u` extension; `build.json` → `1.0.3-rbg-libelf-js-m3u`.
- EmulatorJS `src/emulator.js`: prefer `.m3u` over iso/chd when present (lock hash refreshed to `27e949d3…` / 341588 B).
- Allowlist + CS matrix + private-core manifest synced to Flycast pack `c5f0c6ca…` (3430017 B).
- `seed_demo.py`: Flycast `supported_extensions` includes `m3u` so multidisc publish does not fail `Unsupported entry file extension`.
- GDI smoke: allow intentional MEMFS UTF-8 `.gdi` sidecar bytes (`memfs-sidecar-utf8`) while tracks stay BlobFS.

## 3. Core / JS / WASM hashes

| Artifact | SHA-256 | Bytes |
|---|---|---|
| `flycast-wasm.data` (and legacy) | `c5f0c6ca92300e5d4d747bd9a3ab6db54ae7426656c64a03665f0830635cd075` | 3430017 |
| `flycast_libretro.wasm` | `db2b87d8d2742087a56c4eeed317da14e3549ee037e36de3d77c1e6e5291bead` (unchanged) | 10398725 |
| `reports/flycast.json` | `e69244452c94e9dfa1ad36dda9741d40d8777cc3ba1cdfa62f85d88db6d73ad9` | 252 |
| `ejs-4.2.3/src/emulator.js` | `27e949d3c8d036b69658de067ee10bffecb8086167287da6eb758db7f8a63040` | 341588 |

## 4. Fixtures (legal MIT Dot only)

| Asset | SHA-256 | Notes |
|---|---|---|
| `mit-dreamcast-dot.chd` | `9c5071f347c34bed41bffb05c04966bf241b19a7c519b60ce3397cdd7c5efbf4` | 146838 B; chdman 0.289 createcd from truncated GDI |
| `mit-dreamcast-dot-disc2.chd` | `3e8b39ee1ed399086bdf3ebf339e6c3d003e7c539220f794bc02929f69e1c0dc` | `DOT_VARIANT=2` green idle |
| `mit-dreamcast-dot-multidisc.m3u` | `0f4ac3e52c853d13f8f75f565d4db8b96b76f552ab4e0d73e9b6672f4ece767f` | VFS-absolute `/disc.chd` lines |

Catalog seed: `mit-dreamcast-dot-chd`, `mit-dreamcast-dot-multidisc`.

## 5. CHD gameplay + memory

Evidence: `.runtime/test-evidence/PH-12/dreamcast-chd/chd-status.json`

- On-demand BlobFS: `bytesWritten=0`, peak staging 12631 B, reads 134 / seeks 68 (mount)
- wasm linear memory ~322 MiB (not whole-CHD; do not infer from parent JS heap)
- A/B/A frame save ~36 MiB state

## 6. CHD Compose offline PWA

Harness: `apps/web/tests/dreamcast-chd-offline-pwa.cjs`  
Evidence: `.runtime/test-evidence/PH-12/dreamcast-chd/chd-offline-pwa-journey.json`

Proven on clean Compose images (`COMPOSE_CHD_CLEAN_BUILD_PASS`):

1. Catalog install of legal MIT Dot CHD + integrity
2. Online gameplay + Quick save A → move → Quick load (status-confirmed; pause-screenshot `deltaRA` noisy) → post-restore interaction
3. Full browser close → reopen same persistent profile → network disabled
4. Offline library cold-start, restore, offline save, reload+restore, launch cycles
5. **No** `/api` / object-store / CDN hits while offline
6. Partial-cache Flycast `.data` eviction + repair
7. Corrupted cached core hash ≠ expected (`integrityRejected`)
8. `iframeAfterNav=0` after library navigation

Markers: **`DREAMCAST_CHD_OFFLINE_PWA_PASS`**, **`DREAMCAST_CHD_CLEAN_BUILD_PASS`**.  
Scope: SERVICE_WORKER_OFFLINE only — OS PWA / physical **NOT_VERIFIED**.

## 7. Real disc-swap evidence

Evidence: `.runtime/test-evidence/PH-12/dreamcast-disc-swap/`  
`DREAMCAST_DISC_SWAP_INTERACTIVE_PASS` — frame M3U playlist adapter cold-remount; disc1 grey vs disc2 green. Native `.m3u` content-path boot still aborts.

## 8. Docker socket root cause (Compose unblock)

| Probe | Result |
|---|---|
| Sandboxed agent shell | `/var/run/docker.sock` appeared **missing** (isolation) |
| Host (unsandboxed) | Socket present `root:docker`; `docker.service` **active** since 2026-11-02 18:58; user in `docker` group |

Prior “Docker unavailable” was **agent sandbox socket isolation**, not a stopped daemon. Restored by running Compose with host Docker access. No `chmod 666`, no reinstall, no volume wipe.

## 9. Clean Compose rebuild

`./scripts/compose.sh build api web` + recreate; proxy_ca empty regular-file fix preserved.  
`PRIVATE_CORE_SYNC_OK` LOCAL_FULL; Flycast `c5f0c6ca…` mounted from `.private-runtime`; no host `.next` bind.  
Marker: **`COMPOSE_CHD_CLEAN_BUILD_PASS`**.

## 10. Soak / regressions

- **`CROSS_CONSOLE_SOAK_CLEAN_BUILD_PASS`** / **`CROSS_CONSOLE_SOAK_FULL_PASS`** — 10/10, `SOAK_CYCLES=2` on fresh images (log `clean-build-soak-chd-phase.log`).
- Regressions re-PASS: Dreamcast ELF/GDI/CDI/CHD/disc-swap; Arcade rbgdot; Genesis; NES; FDS; ZX81; Atari 8-bit; Atari ST; N64; PSP; Flash; Orbit smoke; Vitest 85; tsc; Django 43; core-lock 397; `PUBLIC_SOURCE_SAFETY_PASS`; `SOURCE_OFFER_GATE_OK` (delivery still NOT_VERIFIED).

## 11. Remaining blockers

1. Native Flycast `.m3u` content-path boot still aborts — adapter workaround only
2. Product approval still pending for Dreamcast
3. OS PWA / physical devices **NOT_VERIFIED**
4. Owner publication STOP unchanged

## 12. Co-author trailer check

After each new commit: `git log -1 --format=%B` must not contain `Co-authored-by: Cursor`.
