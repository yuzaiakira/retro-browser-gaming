# Dreamcast CHD + interactive disc-swap

Date: 2026-11-02. Branch: `feat/platform-expansion-phase-1`.

## Verdict

| Capability | Status | Marker |
|---|---|---|
| CHD gameplay | **PASS** | `DREAMCAST_CHD_GAMEPLAY_PASS` |
| CHD bounded-memory | **PASS** | `DREAMCAST_CHD_BOUNDED_MEMORY_PASS` |
| CHD save/restore (frame) | **PASS** | `DREAMCAST_CHD_SAVE_RESTORE_PASS` |
| CHD offline PWA (Compose) | **NOT_VERIFIED** | Docker daemon unavailable in this session (`/var/run/docker.sock` missing) |
| Interactive disc-swap | **PASS** | `DREAMCAST_DISC_SWAP_INTERACTIVE_PASS` |
| Clean-build 10-platform soak | **NOT_VERIFIED** this session | Requires Compose |

Dreamcast remains **VERIFIED_PLAYABLE (engineering)** for prior ELF/GDI/CDI. CHD + disc-swap are tracked independently above.

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
| Silent undefined | `WARN_ON_UNDEFINED_SYMBOLS=0` still set; stubs avoid abort |
| Rebuild needed for CHD? | **No** — existing pack already plays CHD |

## 2. Build / linkage changes

- No wasm rebuild. Packaged `core.json` gained `m3u` extension; `build.json` → `1.0.3-rbg-libelf-js-m3u`.
- EmulatorJS `src/emulator.js`: prefer `.m3u` over iso/chd when present.
- `seekable-fs.js`: prefer `.m3u` in `ENTRY_EXTS`; MEMFS UTF-8 for playlist sidecars; `forceMemfs` for disc-swap remounts.
- `frame.js`: Flycast M3U **playlist adapter** — core aborts when content path is `.m3u` (`read_m3u` → load). Adapter boots disc 1, exposes `diskCount`/`diskIndex`/`setDiskIndex`, cold-remounts selected CHD on swap (soft-reset alone keeps old ELF in RAM).

## 3. Core / JS / WASM hashes

| Artifact | SHA-256 | Bytes |
|---|---|---|
| `flycast-wasm.data` (and legacy) | `c5f0c6ca92300e5d4d747bd9a3ab6db54ae7426656c64a03665f0830635cd075` | 3430017 |
| `flycast_libretro.wasm` | `db2b87d8d2742087a56c4eeed317da14e3549ee037e36de3d77c1e6e5291bead` (unchanged) | 10398725 |
| `reports/flycast.json` | `e69244452c94e9dfa1ad36dda9741d40d8777cc3ba1cdfa62f85d88db6d73ad9` | 252 |

Lock: `docs/core-package-lock.json` updated for `.data` + report.

## 4. Fixtures (legal MIT Dot only)

| Asset | SHA-256 | Notes |
|---|---|---|
| `mit-dreamcast-dot.chd` | `9c5071f347c34bed41bffb05c04966bf241b19a7c519b60ce3397cdd7c5efbf4` | chdman 0.289 createcd from truncated GDI |
| `mit-dreamcast-dot-disc2.chd` | `3e8b39ee1ed399086bdf3ebf339e6c3d003e7c539220f794bc02929f69e1c0dc` | `DOT_VARIANT=2` green idle |
| `mit-dreamcast-dot-multidisc.m3u` | `0f4ac3e52c853d13f8f75f565d4db8b96b76f552ab4e0d73e9b6672f4ece767f` | VFS-absolute `/disc.chd` lines |

Build: `scripts/build-dreamcast-chd-and-multidisc.sh` + `fixtures/dreamcast-dot/build-disc2.sh`.  
Catalog seed: `mit-dreamcast-dot-chd`, `mit-dreamcast-dot-multidisc` in `seed_demo.py`.

Truncated GDI→CHD is **not** a full GD-ROM (chdman warns frame count); sufficient for engineering CHD/disc-swap proofs only.

## 5. CHD gameplay + memory

Evidence: `.runtime/test-evidence/PH-12/dreamcast-chd/chd-status.json`

- On-demand BlobFS: `bytesWritten=0`, peak staging ~12 KiB, reads/seeks observed
- wasm heap ~322 MiB (not whole-CHD)
- A/B/A save ~36 MiB state

## 6. CHD save / offline

- Frame save/restore: **PASS**
- Compose `DREAMCAST_CHD_OFFLINE_PWA_PASS`: **blocked** — no Docker socket in agent environment. Harness ready: `apps/web/tests/dreamcast-chd-offline-pwa.cjs`

## 7. Real disc-swap evidence

Evidence: `.runtime/test-evidence/PH-12/dreamcast-disc-swap/`

Sequence: M3U install → disc1 grey idle → `setDiskIndex(1)` cold remount → disc2 green idle + move → `setDiskIndex(0)` → disc1 grey → invalid index rejected.

Adapter: `flycast-m3u-file-swap` (capability-based; not native libretro M3U content boot).

## 8–10. Soak / regressions / legal

- Soak / Compose regressions: **not re-run** (Docker down)
- Vitest `media.test.ts`: 7/7 PASS (M3U absolute-flat names)
- No proprietary BIOS; MIT Dot only; LOCAL_ONLY pack policy preserved

## 11. Commits

| Hash | Subject |
|------|---------|
| `8008d01` | feat(fixtures): add MIT Dreamcast CHD and multi-disc set |
| `4583da3` | feat(web): Flycast M3U playlist adapter and CHD entry prefer |
| `6939b0f` | test(dreamcast): CHD gameplay/save and interactive disc-swap smokes |
| `8d722e0` | docs(ph-12): record Dreamcast CHD and disc-swap evidence |

Each message checked — **no** `Co-authored-by: Cursor` trailer.

## 12. Remaining blockers

1. Compose offline PWA + clean-build soak when Docker is available
2. Native Flycast `.m3u` content-path boot still aborts under this WASM pack — adapter workaround only
3. Product approval still pending for Dreamcast

## 13. Co-author trailer check

After each new commit: `git log -1 --format=%B` must not contain `Co-authored-by: Cursor`.
