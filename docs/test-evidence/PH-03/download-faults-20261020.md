# Browser download fault injection — 2026-10-20

## Execution

Tests ran against the native Compose web application at `http://127.0.0.1:13000` (local port remap; API on `18000` because host `:8000` was occupied by another project) with Chromium 154. The launcher UI, dedicated download worker, OPFS synchronous access handle, IndexedDB journal, service worker, and Web Locks were real browser components. Playwright intercepted only HTTP Range/manifest responses to inject the listed faults.

```bash
cd apps/web
RETRO_TEST_BASE_URL=http://127.0.0.1:13000 \
CHROMIUM_EXECUTABLE=/usr/bin/chromium \
node tests/download-faults.cjs
```

## Result

```text
DOWNLOAD_RETRY_PASS
DOWNLOAD_HTTP_200_REJECT_PASS
DOWNLOAD_HTTP_416_REJECT_PASS
DOWNLOAD_ETAG_CHANGE_REJECT_PASS
DOWNLOAD_SHA256_REJECT_PASS
DOWNLOAD_TWO_TAB_LOCK_PASS
DOWNLOAD_100M_INTERRUPTION_AND_BROWSER_RESTART_PASS
DOWNLOAD_TRUNCATED_CHUNK_REJECT_PASS
DOWNLOAD_CRASH_BEFORE_JOURNAL_RECOVERY_PASS
DOWNLOAD_CHANGED_IDENTITY_NO_SILENT_REUSE_PASS
DOWNLOAD_QUOTA_INSUFFICIENT_PASS
DOWNLOAD_CANCEL_DELETE_PASS
DOWNLOAD_1GIB_BOUNDED_MEMORY_PASS growth=2517696 peak=7750252 baseline=5232556
```

### New coverage since 2026-10-19

- **DL-002:** Truncated Range bodies produce `TRUNCATED_CHUNK` and `recoverable-error` with no installation.
- **DL-008:** After chunk 0 was journaled and every chunk-1 attempt was aborted, resume rehashed chunk 0, fetched only the two remaining ranges, and verified the install.
- **DL-009:** `assetKey` now includes `version`. A mid-download identity/version change installed the new asset from byte 0 and did not silently reuse the prior journal.
- **DL-011:** A 512 GiB manifest fails the worker `QUOTA_INSUFFICIENT` gate before any Range request.
- **DL-012:** Pause then Cancel & delete clears downloads, chunks, installations, and the OPFS directory.
- **DL-013:** A deterministic 1 GiB multi-range transfer completed with final SHA-256 verification. Chromium page JS heap growth was ~2.4 MiB (`growth=2517696`), far below the payload size.

Synthetic fixtures use generated deterministic bytes. Status/lock/hash cases still use the legal HTML5 demo asset where a real small object is required.
