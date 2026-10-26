# Production private assets

## Provisioning model

1. Deploy **public** Git source / CI-built web image (**without** `.data`/`.wasm` layers).
2. Place authorized binaries on the host (or secret artifact store) at e.g. `/srv/retro-browser-gaming/private-assets/` matching `.private-runtime` layout (`cores/...` relative paths from the manifest).
3. Set `RBG_PRIVATE_ASSET_DIR` to that path.
4. Compose/K8s mounts it read-only at `/private-runtime`.
5. `web-entrypoint.sh` copies `.data`/`.wasm` into `/app/public/cores` then starts Next.
6. Run `python3 scripts/verify-core-lock.py --mode PRODUCTION_FULL` against a host checkout that has provisioned public cores **or** verify hashes from the private store against `docs/open-source/private-core-binaries.manifest.json`.

## Security requirements

- No storage credentials in browser responses.
- No proprietary BIOS in the private root used for public product.
- COOP/COEP/CSP remain as configured.
- `CATALOG_ALLOW_ENGINEERING=false` in production; `catalog.E001` must pass.
- Rollback: previous image tag + previous private asset revision (keep asset versions beside app releases).

## What is intentionally browser-delivered

Lawful EmulatorJS/jsdos WASM packages listed in the private-core manifest, when the company elects to offer those platforms. Delivery is same-origin `/cores/...` after provision — users can download those bytes; treat licensing accordingly (GPL obligations for corresponding source remain via public repo + upstream pins).
