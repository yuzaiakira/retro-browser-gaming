/**
 * Isolated MAME-derived arcade frame for driver rbgdot (SUBTARGET rbg_arcade).
 * Protocol mirrors other dedicated frames: init / command / input / ready / error.
 * Trademark: do not brand this UI as "MAME" — neutral arcade runtime only.
 */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const expectedOrigin = params.get('parentOrigin') || (window.parent === window ? location.origin : null);
  let session = null;
  let parentOrigin = expectedOrigin;
  let moduleInstance = null;
  let paused = false;
  let romMounted = false;
  const pending = new Map();
  const statusEl = document.getElementById('status');
  const canvas = document.getElementById('canvas');

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function post(payload) {
    const target = parentOrigin || '*';
    parent.postMessage(payload, target);
  }

  function allowOrigin(origin) {
    if (!parentOrigin || parentOrigin === '*') return true;
    return origin === parentOrigin;
  }

  function keyFromCommand(command, value) {
    // RetroPad-ish mapping into MAME SDL key events via DOM KeyboardEvent when possible.
    // command: 0..15 RetroPad; value 0/1
    const map = {
      4: 'ArrowUp',
      5: 'ArrowDown',
      6: 'ArrowLeft',
      7: 'ArrowRight',
      0: 'Control', // button A -> button1 often Ctrl in MAME defaults; we also send KeyZ
      1: 'Shift',
      8: 'Digit5', // coin
      3: 'Digit1', // start
    };
    return map[command] || null;
  }

  function synthKey(code, down) {
    if (!code) return;
    const ev = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      code,
      key: code.startsWith('Arrow') ? code.replace('Arrow', '') : code,
      bubbles: true,
      cancelable: true,
    });
    (document.activeElement === canvas ? canvas : window).dispatchEvent(ev);
    try {
      canvas.focus();
    } catch {
      /* ignore */
    }
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

  /** Minimal ZIP inflate for the engineering single-member set. */
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

  async function validateAndMountRom(file) {
    const buf = await file.arrayBuffer();
    const members = await unzipMembers(buf, 64 * 1024);
    const id = members.get('rbgdot.id');
    if (!id) throw new Error('ROMSET_MISSING_MEMBER: rbgdot.id');
    if (id.byteLength !== 256) throw new Error('ROMSET_SIZE_MISMATCH: rbgdot.id');
    const hash = await sha256Hex(id);
    if (hash !== EXPECTED_ID_SHA256) throw new Error('ROMSET_HASH_MISMATCH: rbgdot.id');
    if (typeof FS === 'undefined' && !(moduleInstance && moduleInstance.FS)) {
      // Will mount after Module provides FS
      return members;
    }
    const fs = (moduleInstance && moduleInstance.FS) || FS;
    try {
      fs.mkdir('/roms');
    } catch {
      /* exists */
    }
    try {
      fs.mkdir('/roms/rbgdot');
    } catch {
      /* exists */
    }
    fs.writeFile('/roms/rbgdot/rbgdot.id', id);
    romMounted = true;
    return members;
  }

  async function bootMame(members) {
    setStatus('Loading arcade WASM…');
    // Prefer private-runtime synced path; fall back to public cores mirror.
    const candidates = [
      '/cores/mame-rbg-arcade/rbg_arcade.js',
      '/cores/mame-rbg-arcade/mamerbg_arcade.js',
    ];
    let scriptUrl = null;
    for (const url of candidates) {
      const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
      if (res && res.ok) {
        scriptUrl = url;
        break;
      }
    }
    if (!scriptUrl) {
      // Try GET on first path for servers that dislike HEAD
      const res = await fetch(candidates[0]).catch(() => null);
      if (res && res.ok) scriptUrl = candidates[0];
    }
    if (!scriptUrl) {
      throw new Error('MAME_RBG_ARCADE_CORE_MISSING');
    }

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = scriptUrl;
      s.onload = resolve;
      s.onerror = () => reject(new Error('MAME_RBG_ARCADE_SCRIPT_FAIL'));
      document.head.appendChild(s);
    });

    const factory =
      window.createRbgArcadeModule ||
      window.rbg_arcade ||
      window.Module ||
      window.mamerbg_arcade;
    if (typeof factory !== 'function' && typeof factory !== 'object') {
      // Emscripten may set Module via global assignment after script; wait briefly.
    }

    const moduleArg = {
      canvas,
      arguments: ['rbgdot', '-rompath', '/roms', '-window', '-nomaximize', '-skip_gameinfo'],
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return scriptUrl.replace(/\.js$/, '.wasm').replace(/[^/]+\.js$/, path);
        }
        return `/cores/mame-rbg-arcade/${path}`;
      },
      preRun: [
        function (mod) {
          const fs = mod.FS;
          try {
            fs.mkdir('/roms');
          } catch {
            /* */
          }
          try {
            fs.mkdir('/roms/rbgdot');
          } catch {
            /* */
          }
          const id = members.get('rbgdot.id');
          fs.writeFile('/roms/rbgdot/rbgdot.id', id);
          romMounted = true;
        },
      ],
      onRuntimeInitialized: () => {
        setStatus('');
        if (statusEl) statusEl.style.display = 'none';
      },
    };

    if (typeof window.createRbgArcadeModule === 'function') {
      moduleInstance = await window.createRbgArcadeModule(moduleArg);
    } else if (typeof window.rbg_arcade === 'function') {
      moduleInstance = await window.rbg_arcade(moduleArg);
    } else {
      // Classic Module global pattern
      window.Module = Object.assign(window.Module || {}, moduleArg);
      moduleInstance = window.Module;
      // Give the runtime a tick to start
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async function handleInit(data, origin) {
    session = data.session;
    parentOrigin = data.parentOrigin || origin;
    try {
      if (data.core && data.core !== 'mame_rbg_arcade') {
        throw new Error('ROMSET_CORE_DRIVER_MISMATCH');
      }
      const file = data.file;
      if (!file) throw new Error('ROMSET_MISSING_MEMBER');
      const members = await validateAndMountRom(file);
      await bootMame(members);
      post({
        type: 'ready',
        session,
        capabilities: { saveState: true, audio: false, analog: false },
      });
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e));
      post({ type: 'error', session, message: String(e && e.message ? e.message : e) });
    }
  }

  async function handleCommand(data) {
    const { id, method, value } = data;
    try {
      let result = null;
      if (method === 'start' || method === 'resume') {
        paused = false;
      } else if (method === 'pause') {
        paused = true;
      } else if (method === 'reset') {
        synthKey('F3', true);
        synthKey('F3', false);
      } else if (method === 'volume') {
        /* no-op: MACHINE_NO_SOUND fixture */
      } else if (method === 'save') {
        // Prefer MAME state via simulated Shift+F7 / Lua — not yet wired.
        // Fall back: expose lightweight JSON state via Module.cwrap when available.
        if (moduleInstance && typeof moduleInstance.ccall === 'function') {
          throw new Error('MAME_SAVE_STATE_PENDING_WIRING');
        }
        throw new Error('MAME_SAVE_STATE_UNSUPPORTED_UNTIL_VERIFIED');
      } else if (method === 'load') {
        throw new Error('MAME_SAVE_STATE_UNSUPPORTED_UNTIL_VERIFIED');
      } else if (method === 'dispose') {
        try {
          moduleInstance = null;
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
      const code = keyFromCommand(data.command, data.value);
      // Also map coin/start explicitly from common RetroPad indices
      if (data.command === 8) synthKey('Digit5', !!data.value);
      else if (data.command === 3) synthKey('Digit1', !!data.value);
      else synthKey(code, !!data.value);
      // Dual-map button to KeyZ for MAME default button1 on many builds
      if (data.command === 0) synthKey('KeyZ', !!data.value);
    }
  });

  window.addEventListener('pagehide', () => {
    moduleInstance = null;
  });
})();
