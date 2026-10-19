# Browser download fault injection — 2026-10-19

## Execution

The tests ran against the native Compose web application at `http://127.0.0.1:3000` with Chromium 154. The launcher UI, dedicated download worker, OPFS synchronous access handle, IndexedDB journal, service worker, and Web Locks were real browser components. Playwright intercepted only the HTTP range response to inject the listed transport faults.

```bash
cd apps/web
RETRO_TEST_BASE_URL=http://127.0.0.1:3000 \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
node tests/download-faults.cjs
```

## Result

```text
DOWNLOAD_RETRY_PASS
DOWNLOAD_HTTP_200_REJECT_PASS
DOWNLOAD_HTTP_416_REJECT_PASS
DOWNLOAD_SHA256_REJECT_PASS
DOWNLOAD_TWO_TAB_LOCK_PASS
```

- A first `connectionreset` was retried against the real range endpoint and produced one verified installation.
- An unexpected HTTP 200 and HTTP 416 each produced `recoverable-error`; neither inserted an installation.
- A well-formed HTTP 206 containing altered bytes reached OPFS, then failed the worker's final streaming SHA-256 and produced `fatal-error`; it was not installed.
- Two same-origin pages contended for the real `navigator.locks` asset key while the first range was held. The second reported `DOWNLOAD_BUSY_OTHER_TAB`; exactly one verified installation resulted.

This run uses the legal 4.4 KiB HTML5 demo asset. It does not prove interrupted multi-chunk recovery, browser-restart recovery, quota handling, cancellation/deletion, changed manifests, or the required 1 GiB bounded-memory transfer.
