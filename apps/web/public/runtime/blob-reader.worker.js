/**
 * Dedicated reader for on-demand Blob/File slices (and optional OPFS
 * FileSystemSyncAccessHandle when a file handle is registered).
 *
 * Host posts SharedArrayBuffer once via {type:'init', sab}, then registers
 * Files / handles and issues {type:'read', id, offset, length}. Status is
 * written into the SAB so a main-thread spin-wait does not need the event loop.
 *
 * SAB Int32 layout:
 *   [0] status: 0=pending, 1=ok, -1=error
 *   [1] byte count
 *   [2] lock held by host
 *   [3] generation / cancelled session marker
 * Payload begins at byte 16.
 *
 * Offsets use Number (IEEE double integer range) — never `| 0` — so reads past
 * 2 GiB stay correct for large CDI/CHD media.
 */
const files = new Map();
const syncHandles = new Map();
let sab = null;
let control = null;
let payload = null;
let sessionGeneration = 0;
const stats = {
  reads: 0,
  seeks: 0,
  bytesRead: 0,
  peakPayload: 0,
  outstanding: 0,
  lastLatencyMs: 0,
  totalLatencyMs: 0,
  lastOffset: 0,
};

function fail(message) {
  if (control) {
    Atomics.store(control, 1, 0);
    Atomics.store(control, 0, -1);
  }
  self.postMessage({ type: 'error', error: String(message) });
}

function validateRange(offset, length, size) {
  if (!Number.isFinite(offset) || !Number.isFinite(length)) {
    throw new Error('INVALID_READ_RANGE');
  }
  if (offset < 0 || length < 0) throw new Error('NEGATIVE_OFFSET_OR_LENGTH');
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length)) {
    throw new Error('OFFSET_OVERFLOW');
  }
  if (length > payload.byteLength) throw new Error('BLOB_READ_TOO_LARGE');
  if (offset > size) throw new Error('OFFSET_PAST_EOF');
}

async function readViaBlob(file, offset, length) {
  const end = Math.min(file.size, offset + length);
  if (offset >= file.size || length === 0 || end <= offset) {
    return new Uint8Array(0);
  }
  const buffer = await file.slice(offset, end).arrayBuffer();
  return new Uint8Array(buffer);
}

function readViaSyncHandle(handle, offset, length, size) {
  const want = Math.min(length, Math.max(0, size - offset));
  if (want <= 0) return new Uint8Array(0);
  const out = new Uint8Array(want);
  const n = handle.read(out, { at: offset });
  return n === want ? out : out.subarray(0, n);
}

self.onmessage = async (event) => {
  const message = event.data || {};
  try {
    if (message.type === 'init') {
      sab = message.sab;
      control = new Int32Array(sab, 0, 4);
      payload = new Uint8Array(sab, 16);
      sessionGeneration += 1;
      Atomics.store(control, 3, sessionGeneration);
      self.postMessage({ type: 'ready', generation: sessionGeneration });
      return;
    }
    if (message.type === 'dispose') {
      for (const handle of syncHandles.values()) {
        try {
          handle.close();
        } catch {
          /* ignore */
        }
      }
      syncHandles.clear();
      files.clear();
      sessionGeneration += 1;
      if (control) Atomics.store(control, 3, sessionGeneration);
      self.postMessage({ type: 'disposed', generation: sessionGeneration });
      return;
    }
    if (message.type === 'register') {
      files.set(message.id, message.file);
      self.postMessage({ type: 'registered', id: message.id, mode: 'blob' });
      return;
    }
    if (message.type === 'registerHandle') {
      // Optional OPFS SyncAccessHandle path (Dedicated Worker only).
      const handle = message.handle;
      const size = Number(message.size) || 0;
      if (!handle || typeof handle.read !== 'function') {
        throw new Error('SYNC_HANDLE_INVALID');
      }
      syncHandles.set(message.id, { handle, size });
      self.postMessage({ type: 'registered', id: message.id, mode: 'sync-access-handle' });
      return;
    }
    if (message.type === 'unregister') {
      files.delete(message.id);
      const synced = syncHandles.get(message.id);
      if (synced) {
        try {
          synced.handle.close();
        } catch {
          /* ignore */
        }
        syncHandles.delete(message.id);
      }
      return;
    }
    if (message.type === 'stats') {
      self.postMessage({ type: 'stats', stats: { ...stats } });
      return;
    }
    if (message.type !== 'read') return;
    if (!control || !payload) throw new Error('NOT_INITIALIZED');
    if (message.generation != null && message.generation !== sessionGeneration) {
      throw new Error('STALE_SESSION');
    }

    stats.outstanding += 1;
    const started = performance.now();
    try {
      const offset = Number(message.offset);
      const length = Number(message.length);
      const synced = syncHandles.get(message.id);
      const file = files.get(message.id);
      if (!synced && !file) throw new Error('UNKNOWN_BLOB');

      const size = synced ? synced.size : file.size;
      validateRange(offset, length, size);

      if (offset !== stats.lastOffset) stats.seeks += 1;
      stats.lastOffset = offset;

      let bytes;
      if (synced) {
        bytes = readViaSyncHandle(synced.handle, offset, length, size);
      } else {
        bytes = await readViaBlob(file, offset, length);
      }

      if (message.generation != null && message.generation !== sessionGeneration) {
        throw new Error('STALE_SESSION');
      }

      payload.set(bytes);
      Atomics.store(control, 1, bytes.length);
      Atomics.store(control, 0, 1);

      const latency = performance.now() - started;
      stats.reads += 1;
      stats.bytesRead += bytes.length;
      stats.lastLatencyMs = latency;
      stats.totalLatencyMs += latency;
      if (bytes.length > stats.peakPayload) stats.peakPayload = bytes.length;
    } finally {
      stats.outstanding = Math.max(0, stats.outstanding - 1);
    }
  } catch (error) {
    fail(error && error.message ? error.message : error);
  }
};
