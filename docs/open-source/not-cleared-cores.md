# NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION

These private-store binaries remain available for **authorized local/dev**
(`RBG_CORE_PROVISION_MODE=LOCAL_FULL`) but are **excluded** from
`PUBLIC_BROWSER` provisioning, middleware allowlisting, and public deployment sync.

| Path | Missing material | Disposition |
| --- | --- | --- |
| `ejs-4.2.3/cores/81_eo-wasm.data` | Technical CS present (`scripts/patches/81_eo/` + `docs/emulator-builds/zx81-eo-loadp-build.md`); **legal review not completed** for public redistribution of the modified GPL binary | Keep private / LOCAL_FULL until counsel clears |
| `ejs-4.2.3/cores/81_eo-legacy-wasm.data` | Same | Same |
| `ejs-4.2.3/cores/virtualjaguar_js-wasm.data` | Independently rebuilt; only PH-05 rebuild notes; no patch directory | Keep private; EXPERIMENTAL |
| `ejs-4.2.3/cores/virtualjaguar_js-legacy-wasm.data` | Same | Same |

No patches were fabricated. Upstream URLs alone do **not** represent these modified binaries.

Stock `81-*.data` and `virtualjaguar-*.data` (non-`_js` / non-`_eo`) remain separately classified as EmulatorJS packaged cores when present in the allowlist as AUTHORIZED.
