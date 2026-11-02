# Flycast WASM — Dreamcast media formats

Date: 2026-11-02 (CHD + disc-swap refresh). Core pin: Flycast WASM **v1.0** / wasm `db2b87d8…` / pack `c5f0c6ca…` (`1.0.3-rbg-libelf-js-m3u`). See `flycast-wasm-dreamcast.md` and `docs/reports/dreamcast-chd-disc-swap.md`.

## Format matrix (this pinned pack)

| Format | Parser / mount | Bounded-memory BlobFS | Real Chromium gameplay | Notes |
|--------|----------------|------------------------|------------------------|-------|
| `.elf` | REIOS + libelf JS polyfill | N/A (small) | **PASS** (`DREAMCAST_GAMEPLAY_PASS`) | Baseline engineering fixture |
| `.gdi` (+ tracks) | Flycast imgread + launcher GDI parser | **PASS** (`bytesWritten=0`) | **PASS** (`DREAMCAST_GDI_GAMEPLAY_PASS`) | Truncated mkdcdisc GDI (`--gdi-truncate`) |
| `.cdi` | Flycast CDI reader | **PASS** (706 MiB mount, heap 256 MiB) | **PASS** (`DREAMCAST_CDI_GAMEPLAY_PASS`) | mkdcdisc MIL-CD Audio/Data only — not broad CDI claim |
| `.chd` | Flycast `CHDDisc` + libchdr (not `chdstream_*`) | **PASS** | **PASS** (`DREAMCAST_CHD_GAMEPLAY_PASS`) | chdman 0.289 from truncated GDI; see report |
| `.m3u` | Launcher + frame playlist adapter | MEMFS remount for swap | **PASS** (`DREAMCAST_DISC_SWAP_INTERACTIVE_PASS`) | Native `.m3u` content-path boot still aborts; adapter cold-remounts discs |
| `.cue`/`.iso` | Core supports | Prefer seekable | **NOT_VERIFIED** this pass | No separate Dreamcast cue/iso gameplay claim |

## CHD (corrected root cause)

Prior note that soft-stubbed `chdstream_*` blocks CHD was **incorrect** for this pack.

- Flycast opens CHD via **libchdr** (`chd_open_file` / `CHDDisc::tryOpen`).
- `chdstream_*` stubs are RetroArch helpers and remain soft-stubbed to avoid abort; they are off the critical path.
- No wasm rebuild required for CHD gameplay on the current pin.

## GDI validation (launcher)

`apps/web/src/emulators/media.ts`:

- Parses mkdcdisc and classic Redump-style lines.
- Rejects traversal, absolute paths, duplicates, bad sector sizes, track-count mismatches.
- M3U: flat names; optional single leading `/` (VFS absolute) stripped for catalog companions.

## Multi-disc

Flycast WASM aborts when the libretro content path is `.m3u`. The frame adapter:

1. Parses the M3U and boots disc 1 as the real content file.
2. Exposes `diskCount` / `diskIndex` / `setDiskIndex`.
3. On swap, cold-remounts the selected CHD (soft-reset alone keeps the old ELF in RAM).

Machine-verifiable disc identity: disc1 cool-grey idle vs disc2 green idle (`DOT_VARIANT=2`).

## Fixture provenance

| Asset | Build | License |
|-------|-------|---------|
| `mit-dreamcast-dot.elf` | `scripts/build-dreamcast-dot-fixture.sh` | MIT |
| Truncated GDI + tracks | `scripts/build-dreamcast-disc-fixtures.sh` | MIT Dot + mkdcdisc |
| CHD + disc2 + M3U | `scripts/build-dreamcast-chd-and-multidisc.sh` | MIT |
| `dreamcast-dot.cdi` (~700 MiB) | disc fixtures script | gitignored; rebuild locally |

Hashes: `.fixtures/mit-dreamcast-dot.chd.sha256`, `.fixtures/mit-dreamcast-dot-disc2.chd.sha256`, `.fixtures/mit-dreamcast-dot-multidisc.m3u.sha256`.
