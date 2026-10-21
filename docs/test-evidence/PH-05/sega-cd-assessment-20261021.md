# Sega CD / Mega-CD assessment — 2026-10-21

## Verdict

**BLOCKED_BIOS + legal firmware** — Browser core candidates exist (`genesis_plus_gx` is EmulatorJS’s default `segaCD` core and is already vendored for MD/GG). Sega CD still requires **SEGA CD BIOS/firmware** that this project must not redistribute without an authorized source. No legal public-domain Sega CD BIOS is available for bundling.

## Technical reuse

| Concern | Assessment |
| --- | --- |
| Multi-file CUE/BIN | Can reuse PS1 companion resolution / seekable media patterns |
| Audio tracks | Needs real disc fixture evidence; not inferred from PS1 |
| Saves | Unverified for Sega CD in this stack |
| Offline / bounded memory | Same OPFS + Range architecture; not proven for SCD titles |
| PicoDrive alternate | Same **non-commercial** license blocker as 32X |

## Product gate

Do not publish Sega CD catalog releases until BIOS policy is approved and a legal firmware acquisition path exists. Keep matrix status **PLANNED** (BIOS-blocked), not VERIFIED.

## Next step when unblocked

1. Document BIOS provenance + SHA-256 without committing unauthorized blobs if policy requires user-supplied BIOS.
2. Legal multi-track homebrew or authorized SCD image.
3. Gameplay + offline evidence with `segaCD` control scheme.
