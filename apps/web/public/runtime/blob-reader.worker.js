/**
 * Dedicated reader for on-demand Blob/File slices.
 * Host posts SharedArrayBuffer once via {type:'init', sab}, then registers
 * Files and issues {type:'read', id, offset, length}. Status is written into
 * the SAB so a main-thread spin-wait does not need the event loop.
 *
 * SAB Int32 layout:
 *   [0] status: 0=pending, 1=ok, -1=error
 *   [1] byte count
 *   [2] lock held by host
 * Payload begins at byte 16.
 */
const files = new Map();
let sab = null;
let control = null;
let payload = null;

self.onmessage = async (event) => {
  const message = event.data || {};
  try {
    if (message.type === 'init') {
      sab = message.sab;
      control = new Int32Array(sab, 0, 4);
      payload = new Uint8Array(sab, 16);
      self.postMessage({ type: 'ready' });
      return;
    }
    if (message.type === 'register') {
      files.set(message.id, message.file);
      self.postMessage({ type: 'registered', id: message.id });
      return;
    }
    if (message.type === 'unregister') {
      files.delete(message.id);
      return;
    }
    if (message.type !== 'read') return;
    if (!control || !payload) throw new Error('NOT_INITIALIZED');

    const file = files.get(message.id);
    if (!file) throw new Error('UNKNOWN_BLOB');
    const length = Math.max(0, Math.min(message.length | 0, payload.byteLength));
    const offset = Math.max(0, message.offset | 0);
    if (offset >= file.size || length === 0) {
      Atomics.store(control, 1, 0);
      Atomics.store(control, 0, 1);
      return;
    }
    const end = Math.min(file.size, offset + length);
    const buffer = await file.slice(offset, end).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    payload.set(bytes);
    Atomics.store(control, 1, bytes.length);
    Atomics.store(control, 0, 1);
  } catch (error) {
    if (control) {
      Atomics.store(control, 1, 0);
      Atomics.store(control, 0, -1);
    }
    self.postMessage({ type: 'error', error: String(error && error.message ? error.message : error) });
  }
};
