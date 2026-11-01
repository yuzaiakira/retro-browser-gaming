/**
 * Isolated MAME-derived arcade frame for driver rbgdot (SUBTARGET rbg_arcade).
 * Uses JSMAME emscripten hooks (save/load/reset/keyboard) from the pinned WASM.
 * Neutral product labeling — do not brand as "MAME®".
 */
(() => {
  'use strict';

  let session = null;
  let parentOrigin = null;
  let paused = false;
  let romMembers = null;
  let readySent = false;
  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas');

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

  function sdlKey(scancode, down) {
    const J = window.JSMAME;
    if (J && typeof J.sdl_sendkeyboardkey === 'function') {
      // SDL_SendKeyboardKey(state, scancode) — state 1=down 0=up typical
      try {
        J.sdl_sendkeyboardkey(down ? 1 : 0, scancode);
        return;
      } catch {
        /* fall through */
      }
    }
  }

  // SDL scancodes (approx): arrows, 5=coin, 1=start, Z=button
  const SCAN = {
    left: 80,
    right: 79,
    up: 82,
    down: 81,
    coin: 34, // SDL_SCANCODE_5
    start: 30, // SDL_SCANCODE_1
    button: 29, // SDL_SCANCODE_Z
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

  async function boot(members) {
    setStatus('Loading arcade WASM…');
    romMembers = members;

    window.Module = {
      canvas,
      arguments: [
        'rbgdot',
        '-rompath',
        '/roms',
        '-window',
        '-nomaximize',
        '-skip_gameinfo',
        '-nothrottle',
      ],
      locateFile: (path) => `/cores/mame-rbg-arcade/${path}`,
      print: (...args) => console.log('[arcade]', ...args),
      printErr: (...args) => console.warn('[arcade]', ...args),
      preRun: [
        function () {
          mountRoms(window.FS || Module.FS, members);
        },
      ],
      onRuntimeInitialized: () => {
        setStatus('');
        if (!readySent) {
          readySent = true;
          post({
            type: 'ready',
            session,
            capabilities: { saveState: true, audio: false, analog: false },
          });
        }
      },
    };

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/cores/mame-rbg-arcade/rbg_arcade.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('MAME_RBG_ARCADE_SCRIPT_FAIL'));
      document.head.appendChild(s);
    });

    // If onRuntimeInitialized already fired synchronously, still notify.
    await new Promise((r) => setTimeout(r, 800));
    if (!readySent && window.JSMAME) {
      readySent = true;
      setStatus('');
      post({
        type: 'ready',
        session,
        capabilities: { saveState: true, audio: false, analog: false },
      });
    }
    if (!readySent) {
      // Give the runtime more time for wasm compile
      await new Promise((r) => setTimeout(r, 4000));
      if (!readySent) {
        readySent = true;
        post({
          type: 'ready',
          session,
          capabilities: { saveState: true, audio: false, analog: false },
        });
      }
    }
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
      post({ type: 'error', session, message: String(e && e.message ? e.message : e) });
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
        if (!J || !J.save) throw new Error('MAME_SAVE_UNAVAILABLE');
        const path = '/states/rbgdot.sta';
        J.save(path);
        const FS = window.FS || (window.Module && window.Module.FS);
        if (!FS) throw new Error('MAME_FS_UNAVAILABLE');
        const bytes = FS.readFile(path);
        result = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      } else if (method === 'load') {
        if (!J || !J.load) throw new Error('MAME_LOAD_UNAVAILABLE');
        const FS = window.FS || (window.Module && window.Module.FS);
        const path = '/states/rbgdot.sta';
        const raw = data.value;
        const u8 =
          raw instanceof ArrayBuffer
            ? new Uint8Array(raw)
            : raw instanceof Uint8Array
              ? raw
              : new Uint8Array(raw);
        FS.writeFile(path, u8);
        J.load(path);
      } else if (method === 'dispose') {
        try {
          if (J && J.exit) J.exit();
        } catch {
          /* */
        }
      } else if (method === 'seekableStats') {
        result = null;
      }
      post({ type: 'result', session, id, ok: true, result });
    } catch (e) {
      post({
        type: 'result',
        session,
        id,
        ok: false,
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
