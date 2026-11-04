# Arcade ROMset policy (PH-12.4)

Date: 2026-11-01  
Applies to: MAME-derived `mame_rbg_arcade` / driver `rbgdot` and any future arcade SUBTARGET drivers.

## Principles

1. Arcade titles are **immutable ROMset manifests**, not single opaque blobs treated as cartridge dumps.  
2. Public engineering fixtures stay **separate** from user-owned private ROM imports.  
3. **Never** auto-download commercial ROM sets.  
4. **Never** auto-approve catalog games. Product publication remains explicit and pending.  
5. ROMset identity is bound to **core version + driver name + required BIOS/parent set** (empty for `rbgdot`).

## Manifest fields (contract)

| Field | Requirement |
|-------|-------------|
| `driver` | Exact MAME short name (e.g. `rbgdot`) |
| `core_code` | `mame_rbg_arcade` |
| `core_version` / `core_sha256` | Pin matching locked WASM/JS |
| `members[]` | Filename, size, sha256, optional CRC32 as used by driver |
| `parents[]` | Required parent sets (empty for `rbgdot`) |
| `bios[]` | Required BIOS sets (empty for `rbgdot`) |
| `samples[]` | Optional sample packs (none for `rbgdot`) |
| `archive_format` | `zip` (deflate); reject nested/unexpected formats |
| `max_uncompressed_bytes` | Hard cap (decompression bomb guard) |
| `max_member_count` | Hard cap |

## Validation rules

1. Filenames must match the driver ROM definition **exactly** (case-sensitive as MAME expects).  
2. Size and SHA-256 (and CRC when declared) must match; mismatch → reject with clear error.  
3. Missing parent/BIOS members → reject before launch.  
4. ZIP path traversal (`../`, absolute paths, backslashes) → reject.  
5. Decompression must stream with bounded buffers; **no** unbounded whole-archive RAM inflate.  
6. Total uncompressed size and member count must stay under caps.  
7. Malformed ZIP / truncated central directory → reject.  
8. Extra unexpected members may be ignored only when policy explicitly allows; default for engineering fixtures is **exact set**.

## Import paths

| Path | Behavior |
|------|----------|
| Engineering seed | Catalog seed of MIT `rbgdot` ZIP only; product approval pending |
| Authorized local import | User explicitly imports a ZIP they have rights to; validated against selected driver manifest; stored in private OPFS/IDB, never uploaded |
| Network fetch of commercial sets | Disabled |

## Error surfaces

User-visible errors must name the failing check, e.g.:

- `ROMSET_MISSING_MEMBER: cpu1.bin`  
- `ROMSET_HASH_MISMATCH: gfx.bin`  
- `ROMSET_ZIP_TRAVERSAL`  
- `ROMSET_DECOMPRESSION_LIMIT`  
- `ROMSET_PARENT_REQUIRED: neogeo`  
- `ROMSET_CORE_DRIVER_MISMATCH`

## Version coupling

Changing the MAME pin, driver ROM map, or WASM hash **invalidates** prior ROMset approvals. Saves (when supported) must include core + driver + ROMset digests in their identity key.
