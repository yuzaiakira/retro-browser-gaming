// Isolated Hatari (Atari ST) runtime bridge — same postMessage protocol as dos-frame.js.
// Core: self-hosted hatari-2.6.1 WASM + preloaded EmuTOS (GPL-2.0). No proprietary TOS.
let session,
  started = false,
  moduleReady = null;
let shellCodes = new Set(['Escape', 'KeyP', 'KeyF', 'F8', 'F9']);

const CORE_PREFIX = '/cores/hatari-2.6.1/';
const DISK_PATH = '/tmp/game.st';

const reply = (data) => parent.postMessage({ ...data, session }, location.origin);

function editableTarget(t) {
  if (!t || typeof t.closest !== 'function') return false;
  if (t.isContentEditable) return true;
  return !!t.closest('input,select,textarea,[contenteditable="true"]');
}

addEventListener(
  'keydown',
  (e) => {
    if (!session) return;
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
  // SDL maps Arrow* / ControlLeft for default ST joystick.
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

/** Libretro digital pad → Hatari default keyboard joystick (Joy0). */
function mapLibretroToKey(command, value) {
  const down = value === 1;
  switch (command) {
    case 4: // up
      dispatchKey('ArrowUp', 'ArrowUp', down);
      break;
    case 5: // down
      dispatchKey('ArrowDown', 'ArrowDown', down);
      break;
    case 6: // left
      dispatchKey('ArrowLeft', 'ArrowLeft', down);
      break;
    case 7: // right
      dispatchKey('ArrowRight', 'ArrowRight', down);
      break;
    case 0: // B / fire
    case 8: // A
    case 3: // start
      // Hatari default fire key is SDLK_RCTRL.
      dispatchKey('ControlRight', 'Control', down);
      break;
    default:
      break;
  }
}

async function bootHatari(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength) throw new Error('EMPTY_DISK_IMAGE');

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
    'st',
    '--disk-a',
    DISK_PATH,
    '--fastfdc',
    'true',
    // Port 1 = ST game port; cursor keys + RCtrl fire (Hatari defaults).
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
  // Hatari main may start before onRuntimeInitialized in some builds; wait briefly.
  await Promise.race([
    moduleReady,
    new Promise((r) => setTimeout(r, 8000)),
  ]);

  // Give TOS + auto-boot a moment to paint before declaring ready.
  await new Promise((r) => setTimeout(r, 2500));

  started = true;
  reply({
    type: 'ready',
    capabilities: {
      // MemorySnapShot_Capture/Restore are not exported by upstream Emscripten
      // link flags — save/load remains a documented blocker for this runtime.
      saveState: false,
      audio: true,
      analog: false,
      seekableMedia: false,
      onDemandMedia: false,
      hatariRuntime: 'hatari-2.6.1+emutos',
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
        // No exported pause — leave running (honest).
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
        throw new Error('HATARI_SAVESTATE_NOT_EXPORTED');
      case 'load':
        throw new Error('HATARI_SAVESTATE_NOT_EXPORTED');
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
  started = false;
});
