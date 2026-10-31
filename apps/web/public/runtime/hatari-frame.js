// Isolated Hatari (Atari ST) runtime bridge — same postMessage protocol as dos-frame.js.
// Core: self-hosted hatari-2.6.1 WASM + preloaded EmuTOS (GPL-2.0). Snapshot bridge: RBGH v1.
let session,
  started = false,
  disposed = false,
  moduleReady = null,
  snapBusy = false;
let shellCodes = new Set(['Escape', 'KeyP', 'KeyF', 'F8', 'F9']);
/** @type {Uint8Array|null} */
let diskBytes = null;
let diskName = '';
let diskSha256 = '';

const CORE_PREFIX = '/cores/hatari-2.6.1/';
const DISK_PATH = '/tmp/game.st';
const SNAP_PATH = '/tmp/rbg-hatari.snap';
const SNAP_MAGIC = [0x52, 0x42, 0x47, 0x48]; // RBGH
const SNAP_FORMAT = 1;
const CORE_VERSION = 'hatari-2.6.1';
const EMUTOS_REV = '02c2db75fc875265c1449efea014450466cf20b7';
const EMUTOS_SHA256 = '2d6f3f94c212d1d9eb5b9ad913400d934a0fdf56924a7e2c51ff70e27b561b55';
const MACHINE = 'st';

const reply = (data) => {
  if (disposed || !session) return;
  parent.postMessage({ ...data, session }, location.origin);
};

function editableTarget(t) {
  if (!t || typeof t.closest !== 'function') return false;
  if (t.isContentEditable) return true;
  return !!t.closest('input,select,textarea,[contenteditable="true"]');
}

addEventListener(
  'keydown',
  (e) => {
    if (!session || disposed) return;
    if (editableTarget(e.target)) return;
    if (!(shellCodes.has(e.code) || e.key === 'Escape')) return;
    if (e.code === 'F5') return;
    e.preventDefault();
    e.stopPropagation();
    reply({
      type: 'shell-key',
      code: e.code,
      key: e.key,
      ctrlKey: !!e.ctrlKey,
      altKey: !!e.altKey,
      metaKey: !!e.metaKey,
      shiftKey: !!e.shiftKey,
      repeat: !!e.repeat,
      isComposing: !!e.isComposing,
    });
  },
  true,
);

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('HATARI_JS_LOAD_FAILED'));
    document.body.appendChild(s);
  });
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function u32le(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function readU32le(buf, off) {
  return new DataView(buf.buffer, buf.byteOffset + off, 4).getUint32(0, true);
}

function dispatchKey(code, key, down) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const init = {
    key,
    code,
    keyCode: 0,
    which: 0,
    bubbles: true,
    cancelable: true,
  };
  const keyCodes = {
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
    ControlRight: 17,
    Space: 32,
  };
  init.keyCode = keyCodes[code] || 0;
  init.which = init.keyCode;
  canvas.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', init));
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', init));
}

function mapLibretroToKey(command, value) {
  const down = value === 1;
  switch (command) {
    case 4:
      dispatchKey('ArrowUp', 'ArrowUp', down);
      break;
    case 5:
      dispatchKey('ArrowDown', 'ArrowDown', down);
      break;
    case 6:
      dispatchKey('ArrowLeft', 'ArrowLeft', down);
      break;
    case 7:
      dispatchKey('ArrowRight', 'ArrowRight', down);
      break;
    case 0:
    case 8:
    case 3:
      dispatchKey('ControlRight', 'Control', down);
      break;
    default:
      break;
  }
}

function ensureFs() {
  const FS = globalThis.FS || globalThis.Module?.FS;
  if (!FS) throw new Error('FS_MISSING');
  return FS;
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Begin deferred UAE snapshot op, then poll while the SDL/ASYNCIFY loop runs. */
async function awaitSnapshotOp(beginName) {
  const M = globalThis.Module;
  const begin = M.ccall(beginName, 'number', [], []);
  if (begin < 0) throw new Error(`HATARI_SNAPSHOT_BEGIN_FAILED:${beginName}:${begin}`);
  for (let i = 0; i < 400; i++) {
    await sleepMs(25);
    if (disposed) throw new Error('Runtime disposed');
    const rc = M.ccall('rbg_hatari_snapshot_poll', 'number', [], []);
    if (rc === 0) continue;
    if (rc < 0) throw new Error(`HATARI_SNAPSHOT_POLL_FAILED:${rc}`);
    return rc;
  }
  throw new Error('HATARI_SNAPSHOT_TIMEOUT');
}

async function exportSnapshotEnvelope() {
  if (snapBusy) throw new Error('HATARI_SNAPSHOT_BUSY');
  if (disposed) throw new Error('Runtime disposed');
  snapBusy = true;
  const M = globalThis.Module;
  try {
    const rc = await awaitSnapshotOp('rbg_hatari_snapshot_save');
    if (rc < 64) throw new Error(`HATARI_SNAPSHOT_SAVE_FAILED:${rc}`);
    const FS = ensureFs();
    const raw = FS.readFile(SNAP_PATH);
    if (!raw || raw.byteLength < 64) throw new Error('HATARI_SNAPSHOT_EMPTY');
    const rawSha = await sha256Hex(raw);
    const meta = {
      format: SNAP_FORMAT,
      core: 'hatari',
      coreVersion: CORE_VERSION,
      machine: MACHINE,
      emutosRevision: EMUTOS_REV,
      emutosSha256: EMUTOS_SHA256,
      diskName,
      diskSha256,
      timestamp: new Date().toISOString(),
      rawSha256: rawSha,
      rawBytes: raw.byteLength,
    };
    const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
    const out = new Uint8Array(4 + 4 + 4 + metaBytes.length + 4 + raw.byteLength);
    let o = 0;
    out.set(SNAP_MAGIC, o);
    o += 4;
    out.set(u32le(SNAP_FORMAT), o);
    o += 4;
    out.set(u32le(metaBytes.length), o);
    o += 4;
    out.set(metaBytes, o);
    o += metaBytes.length;
    out.set(u32le(raw.byteLength), o);
    o += 4;
    out.set(raw, o);
    M.ccall('rbg_hatari_snapshot_cleanup', null, [], []);
    return out;
  } finally {
    try {
      M?.ccall?.('rbg_hatari_snapshot_cleanup', null, [], []);
    } catch {
      /* ignore */
    }
    snapBusy = false;
  }
}

async function importSnapshotEnvelope(value) {
  if (snapBusy) throw new Error('HATARI_SNAPSHOT_BUSY');
  if (disposed) throw new Error('Runtime disposed');
  snapBusy = true;
  const M = globalThis.Module;
  try {
    const bytes =
      value instanceof Uint8Array
        ? value
        : value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array(value || []);
    if (bytes.byteLength < 16) throw new Error('HATARI_SNAPSHOT_TRUNCATED');
    for (let i = 0; i < 4; i++) {
      if (bytes[i] !== SNAP_MAGIC[i]) throw new Error('HATARI_SNAPSHOT_BAD_MAGIC');
    }
    const format = readU32le(bytes, 4);
    if (format !== SNAP_FORMAT) throw new Error(`HATARI_SNAPSHOT_FORMAT_UNSUPPORTED:${format}`);
    const metaLen = readU32le(bytes, 8);
    if (metaLen < 2 || 12 + metaLen + 4 > bytes.byteLength) {
      throw new Error('HATARI_SNAPSHOT_TRUNCATED');
    }
    let meta;
    try {
      meta = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + metaLen)));
    } catch {
      throw new Error('HATARI_SNAPSHOT_BAD_META');
    }
    if (meta.core !== 'hatari') throw new Error('HATARI_SNAPSHOT_CORE_MISMATCH');
    if (meta.coreVersion !== CORE_VERSION) {
      throw new Error(`HATARI_SNAPSHOT_CORE_VERSION_MISMATCH:${meta.coreVersion}`);
    }
    if (meta.machine && meta.machine !== MACHINE) {
      throw new Error(`HATARI_SNAPSHOT_MACHINE_MISMATCH:${meta.machine}`);
    }
    if (meta.emutosSha256 && meta.emutosSha256 !== EMUTOS_SHA256) {
      throw new Error('HATARI_SNAPSHOT_EMUTOS_MISMATCH');
    }
    if (meta.diskSha256 && diskSha256 && meta.diskSha256 !== diskSha256) {
      throw new Error('HATARI_SNAPSHOT_DISK_MISMATCH');
    }
    const rawOff = 12 + metaLen;
    const rawLen = readU32le(bytes, rawOff);
    if (rawLen < 64 || rawOff + 4 + rawLen > bytes.byteLength) {
      throw new Error('HATARI_SNAPSHOT_TRUNCATED');
    }
    const raw = bytes.subarray(rawOff + 4, rawOff + 4 + rawLen);
    const rawSha = await sha256Hex(raw);
    if (meta.rawSha256 && meta.rawSha256 !== rawSha) {
      throw new Error('HATARI_SNAPSHOT_INTEGRITY');
    }
    const FS = ensureFs();
    FS.writeFile(SNAP_PATH, raw);
    const rc = await awaitSnapshotOp('rbg_hatari_snapshot_restore');
    if (rc < 0) throw new Error(`HATARI_SNAPSHOT_RESTORE_FAILED:${rc}`);
    M.ccall('rbg_hatari_snapshot_cleanup', null, [], []);
    return true;
  } finally {
    try {
      M?.ccall?.('rbg_hatari_snapshot_cleanup', null, [], []);
    } catch {
      /* ignore */
    }
    snapBusy = false;
  }
}

async function bootHatari(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength) throw new Error('EMPTY_DISK_IMAGE');
  diskBytes = bytes;
  diskName = String(file.name || 'game.st').slice(0, 120);
  diskSha256 = await sha256Hex(bytes);

  const canvas = document.getElementById('canvas');
  if (!canvas) throw new Error('CANVAS_MISSING');
  canvas.focus();

  let resolveReady;
  moduleReady = new Promise((r) => {
    resolveReady = r;
  });

  globalThis.HATARI_ARGV = [
    '--desktop',
    'false',
    '--machine',
    MACHINE,
    '--disk-a',
    DISK_PATH,
    '--fastfdc',
    'true',
    '--statusbar',
    'false',
    '-j',
    '1',
  ];

  globalThis.Module = {
    locateFile(path) {
      return CORE_PREFIX + path;
    },
    canvas,
    preRun: [
      () => {
        const FS = globalThis.FS;
        if (!FS) throw new Error('FS_MISSING');
        try {
          FS.mkdir('/tmp');
        } catch {
          /* exists */
        }
        FS.writeFile(DISK_PATH, bytes);
      },
    ],
    print: (...args) => console.log('[hatari]', ...args),
    printErr: (...args) => console.warn('[hatari]', ...args),
    onRuntimeInitialized() {
      resolveReady();
    },
  };

  await loadScript(CORE_PREFIX + 'hatari.js');
  await Promise.race([moduleReady, new Promise((r) => setTimeout(r, 8000))]);
  // Floppy autoboot settle — Pong Wars title usually appears within a few seconds.
  await new Promise((r) => setTimeout(r, 5000));

  if (typeof globalThis.Module?.ccall !== 'function') {
    throw new Error('HATARI_CCALL_MISSING');
  }

  started = true;
  reply({
    type: 'ready',
    capabilities: {
      saveState: true,
      audio: true,
      analog: false,
      seekableMedia: false,
      onDemandMedia: false,
      hatariRuntime: 'hatari-2.6.1+emutos',
      hatariSnapshotFormat: SNAP_FORMAT,
      pointer: true,
      keyboard: true,
    },
  });
}

addEventListener('message', async (event) => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const d = event.data;
  if (d.type === 'init' && !session) {
    session = d.session;
    disposed = false;
    try {
      await bootHatari(d.file);
    } catch (error) {
      reply({ type: 'error', error: String(error?.message || error) });
    }
    return;
  }
  if (d.session !== session) return;
  if (d.type === 'command' && d.method === 'setShellKeys') {
    const list = Array.isArray(d.value) ? d.value : [];
    shellCodes = new Set(
      list.filter((c) => typeof c === 'string' && c.length > 0 && c.length <= 40),
    );
    reply({ type: 'reply', id: d.id, value: true });
    return;
  }
  if (!started) return;
  if (d.type === 'input') {
    mapLibretroToKey(d.command, d.value);
    return;
  }
  if (d.type !== 'command') return;
  try {
    let value = null;
    const M = globalThis.Module;
    switch (d.method) {
      case 'start':
      case 'resume':
        try {
          M?.ccall?.('Main_UnPauseEmulation', null, [], []);
        } catch {
          /* ignore */
        }
        break;
      case 'pause':
        break;
      case 'reset':
        try {
          M?.ccall?.('Reset_Warm', null, [], []);
        } catch {
          /* ignore */
        }
        break;
      case 'volume':
        break;
      case 'save':
        value = await exportSnapshotEnvelope();
        break;
      case 'load':
        value = await importSnapshotEnvelope(d.value);
        break;
      case 'seekableStats':
        value = null;
        break;
      default:
        throw new Error('UNSUPPORTED_OPERATION');
    }
    reply({ type: 'reply', id: d.id, value });
  } catch (error) {
    reply({ type: 'reply', id: d.id, error: String(error?.message || error) });
  }
});

addEventListener('pagehide', () => {
  disposed = true;
  started = false;
  snapBusy = false;
  try {
    globalThis.Module?.ccall?.('rbg_hatari_snapshot_cleanup', null, [], []);
  } catch {
    /* ignore */
  }
});
