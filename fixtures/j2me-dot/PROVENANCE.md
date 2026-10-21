# MIT J2ME Dot — provenance

| Field | Value |
| --- | --- |
| Name | MIT J2ME Dot |
| License | MIT (`LICENSE.txt`) |
| Source | First-party original (`src/retro/j2me/dot/`) |
| Profile | CLDC-1.1 / MIDP-2.0 (compiled against local stubs; stubs not packaged) |
| Build | `./build.sh` (requires JDK `javac`/`jar`) |
| Outputs | `build/jar/mit-j2me-dot.jar`, `build/jar/mit-j2me-dot.jad` → `.fixtures/` |

## SHA-256

| File | SHA-256 |
| --- | --- |
| `mit-j2me-dot.jar` | `63afd7fa5a851eec7e64ea25e49d36a5239a8c935cbb80600851c10fed2a50e2` |
| `mit-j2me-dot.jad` | `eadb0ebe7d4f3d6b7516bd96a2f5b2afdd3f5c1386740479eec543c67f5570ef` |

Rebuild may change hashes if the JDK stamps `Created-By` differently; re-record after `./build.sh`.

## Runtime

Executed by self-hosted **js2me** (MIT) under `/cores/js2me/`. Not a JavaScript imitation of the game — bytecode is interpreted by js2me.
