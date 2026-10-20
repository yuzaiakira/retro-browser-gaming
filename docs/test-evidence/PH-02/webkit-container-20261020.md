# Playwright WebKit via container — 2026-10-20

Host WebKit failed missing `libicu`/`libwebp`/`libffi`. A reproducible runner avoids host package changes:

```bash
docker build -f infra/docker/webkit-test.Dockerfile -t retro-webkit-test .
docker run --rm --network host -v "$PWD/apps/web:/work" -w /work \
  -e RETRO_TEST_BASE_URL=http://127.0.0.1:13000 \
  retro-webkit-test node tests/browser-matrix-smoke.cjs
```

## Result

```text
MATRIX_WEBKIT_CATALOG_PASS
```

Orbit install in WebKit left the Download button **disabled** (capability probe). WebKit catalog discovery is verified; WebKit OPFS install/offline and console gameplay remain `NOT_VERIFIED`.

**Playwright WebKit is not iOS Safari evidence.**
