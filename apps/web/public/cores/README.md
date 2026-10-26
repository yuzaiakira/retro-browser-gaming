# Emulator cores (public tree)

JavaScript loaders, EmulatorJS GPL sources, reports, and localization remain in Git.

**Binary payloads** (`.data`, `.wasm`) are **not** tracked. They live under the private asset root:

- Local default: `.private-runtime/cores/`
- Env: `RBG_PRIVATE_ASSET_DIR`

Provision into this tree:

```bash
python3 scripts/provision-private-cores.py          # copy
python3 scripts/provision-private-cores.py --link   # symlink (dev)
python3 scripts/verify-core-lock.py --mode LOCAL_FULL
```

Docker Compose mounts the private root and `scripts/web-entrypoint.sh` syncs binaries before Next starts.

See `docs/open-source/local-private-assets.md`.
