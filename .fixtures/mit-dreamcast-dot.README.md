# MIT Dreamcast Dot (engineering fixture)

| Field | Value |
|-------|-------|
| File | `mit-dreamcast-dot.elf` |
| SHA-256 | `ffafb5d50a89c0c8077ec2cbfe80ff82306d7f8bec8d7e98e9eaf7c213f0608e` |
| License | MIT (`fixtures/dreamcast-dot/LICENSE.txt`, `LICENSES/dreamcast-dot-MIT.txt`) |
| SDK | KallistiOS via `kazade/dreamcast-sdk:latest` (sh-elf GCC 15.2.0) |
| Build | `bash scripts/build-dreamcast-dot-fixture.sh` |
| Disc images | `bash scripts/build-dreamcast-disc-fixtures.sh` → truncated GDI + CDI |
| Sources | `fixtures/dreamcast-dot/` |

Interactive: D-Pad / analog move a 32×32 rectangle; A toggles fire color; Start exits.
Deterministic start at screen center. No proprietary assets.

## Disc formats (generated, not commercial)

| Format | Path | Notes |
|--------|------|-------|
| ELF | `.fixtures/mit-dreamcast-dot.elf` | Compact engineering boot (baseline) |
| GDI | `.fixtures/dreamcast-gdi/` | Truncated multi-track (`--gdi-truncate`); ~3 MiB |
| CDI | `.fixtures/dreamcast-dot.cdi` | Self-boot MIL-CD (~700 MiB); **gitignored** |

Provenance: mkdcdisc (Simulant) inside the KallistiOS Docker image; bootstrap is the mkdcdisc built-in unofficial IP.BIN (no SEGA BIOS).
