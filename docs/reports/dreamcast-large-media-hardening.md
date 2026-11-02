# Dreamcast large-media hardening (PH-12.5 follow-on)

Date: 2026-11-02. Branch: `feat/platform-expansion-phase-1`.

## 1. Existing storage architecture findings

| Layer | Role | Memory-copy points |
|-------|------|--------------------|
| Download worker (`download.worker.ts`) | HTTP Range → OPFS via `FileSystemSyncAccessHandle`; chunk journal + rehash | Staging ≤8 MiB; streaming SHA-256 |
| OPFS `content.bin` | Durable asset bytes | `getFile()` → `File` (no full ArrayBuffer required) |
| `seekable-fs.js` | EmulatorJS mount | **Small:** chunked MEMFS writes (≤8 MiB slices). **Large / on-demand cores:** BlobFS nodes |
| `blob-reader.worker.js` | Dedicated Worker + SAB (8 MiB payload) | `File.slice` → `arrayBuffer` window only; host `dest.set(payload)` into WASM heap buffer |
| EmulatorJS MEMFS | Full-file path | Whole media in WASM heap if BlobFS not used |
| Flycast mmap | stream_ops.mmap | Rejected above 16 MiB |

**Pre-change gap:** `ON_DEMAND_CORES` was only `ppsspp` / `pcsx_rearmed`. Flycast discs under 16 MiB (and any small GDI tracks) could MEMFS-copy. Blob reader used `offset \| 0` (32-bit truncation). CHD unusable: `chdstream_*` soft-stubs.

**SyncAccessHandle:** already used for download writes. Reader optionally accepts `registerHandle` in the Dedicated Worker; gameplay path continues to use OPFS `File` + BlobFS (no redundant parallel VFS).

## 2. Implemented changes

- Flycast added to on-demand BlobFS cores; prefer `.gdi`/`.cdi`/`.chd`/`.m3u`/`.elf` entry selection.
- 64-bit-safe offsets; reject negative/overflow/invalid ranges; session generation + dispose.
- Diagnostics: reads, seeks, bytesRead, peakPayload, latency, outstanding.
- GDI + M3U parsers in `media.ts` with path-safety rules; Vitest coverage.
- Legal truncated GDI + CDI fixtures via mkdcdisc; catalog seed `mit-dreamcast-dot-gdi`.
- Flycast `supported_extensions` includes `bin`/`raw` for GDI tracks.
- Smokes: `dreamcast-gdi-smoke.cjs`, `dreamcast-cdi-smoke.cjs`, `dreamcast-gdi-offline-pwa.cjs`.

## 3. Validated formats

| Marker | Result |
|--------|--------|
| `DREAMCAST_GDI_GAMEPLAY_PASS` | PASS — onDemand, bytesWritten=0, seeks/reads >0 |
| `DREAMCAST_GDI_SAVE_RESTORE_PASS` | PASS — ~36 MiB state |
| `DREAMCAST_GDI_OFFLINE_PWA_PASS` | PASS — Compose SW offline |
| `DREAMCAST_CDI_GAMEPLAY_PASS` | PASS — 740 076 137 B CDI; wasm heap 256 MiB; peak staging 2335 B |
| `DREAMCAST_CHD_GAMEPLAY_PASS` | Superseded 2026-11-02 evening — see `dreamcast-chd-disc-swap.md` (**PASS**) |
| Multi-disc swap | Superseded — `DREAMCAST_DISC_SWAP_INTERACTIVE_PASS` (playlist adapter) |

## 4. Large-file download / recovery

`RETRO_TEST_BASE_URL=http://launcher.localhost:13000 node apps/web/tests/download-faults.cjs`:

All markers PASS including `DOWNLOAD_100M_INTERRUPTION_AND_BROWSER_RESTART_PASS` and `DOWNLOAD_1GIB_BOUNDED_MEMORY_PASS` (page JS heap peak ~9.6 MiB; RSS unavailable).

A successful large download is **not** claimed as Flycast boot proof; CDI/GDI gameplay used separate smokes.

## 5. Peak measurable buffer / memory

| Metric | GDI | CDI |
|--------|-----|-----|
| wasmHeap before/after mount | 256 MiB / 256 MiB | 256 MiB / 256 MiB |
| bytesWritten (MEMFS) | 0 | 0 |
| peak staging payload | 2351 B | 2335 B |
| payloadCapacity | 8 MiB | 8 MiB |
| reader reads / seeks | 240 / 239 | 270 / 270 |
| Host RSS | not claimed | not claimed |

## 6–8. Gameplay / save / offline

See markers above. ELF baseline remains the engineering VERIFIED_PLAYABLE compact path. GDI adds multi-file offline catalog proof. CDI proves large single-file on-demand boot (gitignored fixture).

## 9. Regressions

Recorded in EXECUTION_STATE after suite run. Intent: Vitest, tsc, Django, Dreamcast ELF, Genesis, and prior platform smokes without inventing results.

## 10. Remaining blockers

1. **CHD / multi-disc:** Chromium engineering proofs closed — see `dreamcast-chd-disc-swap.md`. Compose CHD offline + clean soak still open (Docker).
2. **CDI breadth:** one mkdcdisc variant only.
3. **Truncated GDI:** emulator/ODE only; not a full GD-ROM image.
4. Product approval / OS PWA / physical devices still open.
5. Large CDI must stay gitignored; rebuild via `scripts/build-dreamcast-disc-fixtures.sh`.

## 11–12. Commits / authorship

| Hash | Subject |
|------|---------|
| `5cddeaa` | docs(ph-12): correct Dreamcast large-media commit hash table |
| `7cfdb4c` | docs(ph-12): fill Dreamcast large-media commit hash table |
| `6f8e93c` | docs(ph-12): record Dreamcast large-media hardening evidence |
| `f5f334e` | test(web): add Dreamcast GDI/CDI gameplay and GDI offline PWA proofs |
| `417e6c5` | feat(api): seed Dreamcast GDI catalog release for flycast |
| `46ee41d` | feat(fixtures): add legal truncated Dreamcast GDI disc set |
| `e294044` | feat(web): harden BlobFS disc reads and Dreamcast GDI/M3U parsers |

Each new commit message was checked with `git log -1 --format=%B` — **no** `Co-authored-by: Cursor <cursoragent@cursor.com>` trailer. Author remains the configured human identity (`Akira <yuzai.akira@gmail.com>`).

## Evidence

`.runtime/test-evidence/PH-12/dreamcast-large-media/` (`gdi-status.json`, `cdi-status.json`, `gdi-offline-pwa-journey.json`, screenshots).
