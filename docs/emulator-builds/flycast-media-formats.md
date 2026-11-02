# Flycast WASM — Dreamcast media formats

Date: 2026-11-02. Core pin unchanged: Flycast WASM **v1.0** / pack `5ef913f5…` / wasm `db2b87d8…` (see `flycast-wasm-dreamcast.md`).

## Format matrix (this pinned pack)

| Format | Parser / mount | Bounded-memory BlobFS | Real Chromium gameplay | Notes |
|--------|----------------|------------------------|------------------------|-------|
| `.elf` | REIOS + libelf JS polyfill | N/A (small) | **PASS** (`DREAMCAST_GAMEPLAY_PASS`) | Baseline engineering fixture |
| `.gdi` (+ tracks) | Flycast imgread + launcher GDI parser | **PASS** (`bytesWritten=0`) | **PASS** (`DREAMCAST_GDI_GAMEPLAY_PASS`) | Truncated mkdcdisc GDI (`--gdi-truncate`) |
| `.cdi` | Flycast CDI reader | **PASS** (706 MiB mount, heap 256 MiB) | **PASS** (`DREAMCAST_CDI_GAMEPLAY_PASS`) | mkdcdisc MIL-CD Audio/Data only — not broad CDI claim |
| `.chd` | **Blocked** | — | **NOT_VERIFIED** | Pack soft-stubs all `chdstream_*` → `0` |
| `.m3u` | Launcher path validation | — | Disc-swap **NOT_VERIFIED** | Flat filenames only; no browser swap demo yet |
| `.cue`/`.iso` | Core supports | Prefer seekable | **NOT_VERIFIED** this pass | No separate Dreamcast cue/iso gameplay claim |

## CHD blocker (exact)

Inspected packaged `flycast_libretro.js`:

- `_chdstream_open`, `_chdstream_read`, `_chdstream_seek`, `_chdstream_close`, … are JS soft-stubs returning `0` (same packaging note as zip/miniupnpc).
- Restoring CHD requires rebuilding/packaging Flycast with real libchdr/`chdstream` linkage (wasm pin change + lock regeneration). Do **not** emit `DREAMCAST_CHD_GAMEPLAY_PASS` on this pack.

## GDI validation (launcher)

`apps/web/src/emulators/media.ts`:

- Parses mkdcdisc (`N startLba type sectorSize filename offset`) and classic Redump-style lines.
- Rejects traversal, absolute paths, duplicates, bad sector sizes, track-count mismatches, unsafe names.
- Allows quoted filenames with spaces.
- Binds companions to immutable `requiredFiles` / catalog assets.

## CDI scope honesty

Validated variant: **mkdcdisc v0.0.4** self-boot MIL-CD Audio/Data produced from MIT Dot ELF inside `kazade/dreamcast-sdk`. Other CDI dialects are untested.

## Multi-disc

M3U companion names are validated (flat, no traversal). Flycast disk-control / interactive disc swapping is **not** demonstrated — do not mark verified.

## Fixture provenance

| Asset | Build | License |
|-------|-------|---------|
| `mit-dreamcast-dot.elf` | `scripts/build-dreamcast-dot-fixture.sh` | MIT |
| Truncated GDI + tracks | `scripts/build-dreamcast-disc-fixtures.sh` (mkdcdisc `--gdi-truncate`) | MIT Dot + mkdcdisc bootstrap |
| `dreamcast-dot.cdi` (~700 MiB) | same script | gitignored; rebuild locally |

Hashes: `.fixtures/mit-dreamcast-dot.sha256`, `.fixtures/dreamcast-dot.gdi.sha256`, `.fixtures/dreamcast-dot.cdi.sha256` (local).
