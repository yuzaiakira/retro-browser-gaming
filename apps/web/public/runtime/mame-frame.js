/**
 * Isolated MAME-derived arcade frame for driver rbgdot (SUBTARGET rbg_arcade).
 * Software video path only (-video soft). Do not brand as "MAME®".
 */
(() => {
  'use strict';

  let session = null;
  let parentOrigin = null;
  let paused = false;
  let romMembers = null;
  let readySent = false;
  let saveInFlight = false;
  let loadInFlight = false;
  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas');
  const diag = {
    wasmInstantiated: false,
    runtimeInitialized: false,
    machineRunning: false,
    video: 'soft',
    consoleTail: [],
  };

  function setStatus(msg) {
    if (statusEl) {
      statusEl.style.display = msg ? 'block' : 'none';
      statusEl.textContent = msg || '';
    }
  }

  function post(payload) {
    parent.postMessage(payload, parentOrigin || '*');
  }

  function allowOrigin(origin) {
    if (!parentOrigin || parentOrigin === '*') return true;
    return origin === parentOrigin;
  }

  function logDiag(...args) {
    const line = args.map(String).join(' ');
    diag.consoleTail.push(line);
    if (diag.consoleTail.length > 80) diag.consoleTail.shift();
    console.log('[arcade]', ...args);
  }

  async function sha256Hex(buf) {
    const dig = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function assertSafeName(name) {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new Error('ROMSET_ZIP_TRAVERSAL');
    }
  }

  async function unzipMembers(arrayBuffer, maxUncompressed) {
    const u8 = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const out = new Map();
    let offset = 0;
    let total = 0;
    while (offset + 30 <= u8.length) {
      const sig = view.getUint32(offset, true);
      if (sig === 0x02014b50 || sig === 0x06054b50) break;
      if (sig !== 0x04034b50) throw new Error('ROMSET_MALFORMED_ZIP');
      const method = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const uncompSize = view.getUint32(offset + 22, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const name = new TextDecoder().decode(u8.subarray(nameStart, nameStart + nameLen));
      assertSafeName(name);
      total += uncompSize;
      if (total > maxUncompressed) throw new Error('ROMSET_DECOMPRESSION_LIMIT');
      const dataStart = nameStart + nameLen + extraLen;
      const compressed = u8.subarray(dataStart, dataStart + compSize);
      let raw;
      if (method === 0) raw = compressed.slice();
      else if (method === 8) {
        const ds = new DecompressionStream('deflate-raw');
        const ab = await new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer();
        raw = new Uint8Array(ab);
      } else throw new Error('ROMSET_MALFORMED_ZIP');
      out.set(name, raw);
      offset = dataStart + compSize;
    }
    return out;
  }

  const EXPECTED_ID_SHA256 =
    '6357cc228a2504250c8c81df7792429122eefc2489303cb7be6ab126009896ab';

  async function validateRom(file) {
    const buf = await file.arrayBuffer();
    const members = await unzipMembers(buf, 64 * 1024);
    const id = members.get('rbgdot.id');
    if (!id) throw new Error('ROMSET_MISSING_MEMBER: rbgdot.id');
    if (id.byteLength !== 256) throw new Error('ROMSET_SIZE_MISMATCH: rbgdot.id');
    const hash = await sha256Hex(id);
    if (hash !== EXPECTED_ID_SHA256) throw new Error('ROMSET_HASH_MISMATCH: rbgdot.id');
    return members;
  }

  function mountRoms(FS, members) {
    try {
      FS.mkdir('/roms');
    } catch {
      /* */
    }
    try {
      FS.mkdir('/roms/rbgdot');
    } catch {
      /* */
    }
    try {
      FS.mkdir('/states');
    } catch {
      /* */
    }
    FS.writeFile('/roms/rbgdot/rbgdot.id', members.get('rbgdot.id'));
  }

  function getFS() {
    return window.FS || (window.Module && window.Module.FS);
  }

  function sdlKey(scancode, down) {
    const J = window.JSMAME;
    if (J && typeof J.sdl_sendkeyboardkey === 'function') {
      try {
        J.sdl_sendkeyboardkey(down ? 1 : 0, scancode);
        return;
      } catch (e) {
        logDiag('sdl_sendkeyboardkey fail', e);
      }
    }
  }

  // SDL scancodes: arrows, 5=coin, 1=start, Z=button
  const SCAN = {
    left: 80,
    right: 79,
    up: 82,
    down: 81,
    coin: 34,
    start: 30,
    button: 29,
  };

  function mapCommand(command, value) {
    const down = !!value;
    if (command === 6) sdlKey(SCAN.left, down);
    else if (command === 7) sdlKey(SCAN.right, down);
    else if (command === 4) sdlKey(SCAN.up, down);
    else if (command === 5) sdlKey(SCAN.down, down);
    else if (command === 8) sdlKey(SCAN.coin, down);
    else if (command === 3) sdlKey(SCAN.start, down);
    else if (command === 0) sdlKey(SCAN.button, down);
  }

  function machinePtr() {
    const J = window.JSMAME || window.JSMESS;
    if (!J || typeof J.get_machine !== 'function') return 0;
    try {
      return J.get_machine() || 0;
    } catch {
      return 0;
    }
  }

  function isMachineRunning() {
    const J = window.JSMAME || window.JSMESS;
    if (J && J.running) return true;
    return machinePtr() !== 0;
  }

  function sendReady() {
    if (readySent) return;
    readySent = true;
    diag.machineRunning = true;
    setStatus('');
    post({
      type: 'ready',
      session,
      capabilities: { saveState: true, audio: false, analog: false },
      diag: {
        video: diag.video,
        wasmInstantiated: diag.wasmInstantiated,
        runtimeInitialized: diag.runtimeInitialized,
        machineRunning: diag.machineRunning,
      },
    });
  }

  async function waitForMachine(timeoutMs) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (isMachineRunning()) {
        sendReady();
        return true;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  async function waitForStateFile(path, timeoutMs) {
    const FS = getFS();
    if (!FS) throw new Error('MAME_FS_UNAVAILABLE');
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      try {
        const st = FS.stat(path);
        if (st && st.size > 0) return FS.readFile(path);
      } catch {
        /* not yet */
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('MAME_SAVE_TIMEOUT');
  }

  async function boot(members) {
    setStatus('Loading arcade WASM…');
    romMembers = members;

    window.Module = {
      canvas,
      arguments: [
        'rbgdot',
        '-rompath',
        '/roms',
        '-video',
        'soft',
        '-sound',
        'none',
        '-window',
        '-nomaximize',
        '-skip_gameinfo',
        '-nothrottle',
        '-verbose',
      ],
      locateFile: (path) => `/cores/mame-rbg-arcade/${path}`,
      print: (...args) => logDiag(...args),
      printErr: (...args) => {
        logDiag('ERR', ...args);
        console.warn('[arcade]', ...args);
      },
      preRun: [
        function () {
          mountRoms(window.FS || Module.FS, members);
          logDiag('roms mounted under /roms/rbgdot');
        },
      ],
      onRuntimeInitialized: () => {
        diag.runtimeInitialized = true;
        diag.wasmInstantiated = true;
        logDiag('onRuntimeInitialized (WASM up; machine not yet running)');
        setStatus('Starting arcade driver…');
      },
      onAbort: (reason) => {
        logDiag('ABORT', reason);
        setStatus(String(reason));
        post({ type: 'error', session, message: `MAME_ABORT: ${reason}` });
      },
    };

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/cores/mame-rbg-arcade/rbg_arcade.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('MAME_RBG_ARCADE_SCRIPT_FAIL'));
      document.head.appendChild(s);
    });
    diag.wasmInstantiated = true;
    logDiag('glue script loaded; waiting for running_machine');

    // Ready only after emscripten_set_running_machine (JSMESS.running / get_machine).
    const ok = await waitForMachine(120000);
    if (!ok) {
      const msg =
        'MAME_MACHINE_START_TIMEOUT — WASM may be up but rbgdot/video soft did not reach main loop';
      logDiag(msg, JSON.stringify(diag.consoleTail.slice(-20)));
      setStatus(msg);
      post({ type: 'error', session, error: msg, message: msg, diag });
      throw new Error(msg);
    }
    logDiag('machine running; soft video path active');
  }

  async function handleInit(data, origin) {
    session = data.session;
    parentOrigin = data.parentOrigin || origin;
    try {
      if (data.core && data.core !== 'mame_rbg_arcade') {
        throw new Error('ROMSET_CORE_DRIVER_MISMATCH');
      }
      if (!data.file) throw new Error('ROMSET_MISSING_MEMBER');
      const members = await validateRom(data.file);
      await boot(members);
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e));
      post({
        type: 'error',
        session,
        error: String(e && e.message ? e.message : e),
        message: String(e && e.message ? e.message : e),
      });
    }
  }

  async function handleCommand(data) {
    const { id, method } = data;
    try {
      let result = null;
      const J = window.JSMAME;
      if (method === 'start' || method === 'resume') {
        paused = false;
        if (J && J.sdl_pauseaudio) J.sdl_pauseaudio(0);
      } else if (method === 'pause') {
        paused = true;
        if (J && J.sdl_pauseaudio) J.sdl_pauseaudio(1);
      } else if (method === 'reset') {
        if (J && J.soft_reset) J.soft_reset();
      } else if (method === 'volume') {
        /* MACHINE_NO_SOUND */
      } else if (method === 'save') {
        if (saveInFlight || loadInFlight) throw new Error('MAME_SAVE_BUSY');
        if (!J || !J.save) throw new Error('MAME_SAVE_UNAVAILABLE');
        if (!isMachineRunning()) throw new Error('MAME_NOT_RUNNING');
        saveInFlight = true;
        try {
          const path = '/states/rbgdot.sta';
          const FS = getFS();
          try {
            FS.unlink(path);
          } catch {
            /* */
          }
          J.save(path);
          const bytes = await waitForStateFile(path, 15000);
          result = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        } finally {
          saveInFlight = false;
        }
      } else if (method === 'load') {
        if (saveInFlight || loadInFlight) throw new Error('MAME_LOAD_BUSY');
        if (!J || !J.load) throw new Error('MAME_LOAD_UNAVAILABLE');
        if (!isMachineRunning()) throw new Error('MAME_NOT_RUNNING');
        loadInFlight = true;
        try {
          const FS = getFS();
          const path = '/states/rbgdot.sta';
          const raw = data.value;
          if (!raw || (raw.byteLength !== undefined && raw.byteLength < 16)) {
            throw new Error('MAME_STATE_TRUNCATED');
          }
          const u8 =
            raw instanceof ArrayBuffer
              ? new Uint8Array(raw)
              : raw instanceof Uint8Array
                ? raw
                : new Uint8Array(raw);
          if (u8.byteLength < 16) throw new Error('MAME_STATE_TRUNCATED');
          FS.writeFile(path, u8);
          J.load(path);
          // Allow scheduled load to apply on next main-loop ticks
          await new Promise((r) => setTimeout(r, 200));
        } finally {
          loadInFlight = false;
        }
      } else if (method === 'dispose') {
        try {
          if (J && J.exit) J.exit();
        } catch {
          /* */
        }
      } else if (method === 'seekableStats') {
        result = null;
      } else if (method === 'diag') {
        result = {
          ...diag,
          machinePtr: machinePtr(),
          running: isMachineRunning(),
          canvas: {
            width: canvas ? canvas.width : 0,
            height: canvas ? canvas.height : 0,
          },
        };
      }
      post({ type: 'reply', session, id, value: result });
    } catch (e) {
      post({
        type: 'reply',
        session,
        id,
        error: String(e && e.message ? e.message : e),
      });
    }
  }

  window.addEventListener('message', (event) => {
    if (!allowOrigin(event.origin) && parentOrigin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'init') {
      handleInit(data, event.origin);
      return;
    }
    if (!session || data.session !== session) return;
    if (data.type === 'command') handleCommand(data);
    if (data.type === 'input') {
      if (paused) return;
      mapCommand(data.command, data.value);
    }
  });

  window.addEventListener('pagehide', () => {
    try {
      window.JSMAME && window.JSMAME.exit && window.JSMAME.exit();
    } catch {
      /* */
    }
  });
})();
