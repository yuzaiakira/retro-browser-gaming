// Adapter bridge pinned to EmulatorJS e150dc0491ae747028919fb82d6598954976ede6.
// Internal methods are isolated here, audited against the vendored source and runtime-tested.
let session, started = false, seekableBridge;
const urls = [];
const reply = (data) => parent.postMessage({ ...data, session }, location.origin);
addEventListener('error', (e) => reply({ type: 'error', error: e.message }));

function revoke() {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
  seekableBridge?.dispose();
  seekableBridge = undefined;
}

function preferSeekable(file, companions) {
  const total = [file, ...(companions || [])].reduce((sum, item) => sum + (item?.size || 0), 0);
  return total > 0;
}

function seekableReady() {
  return typeof window.RetroSeekableFS?.installSeekableLoader === 'function';
}

addEventListener('message', async (event) => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const d = event.data;
  if (d.type === 'init' && !session) {
    session = d.session;
    const companions = d.companions || [];
    const externalFiles = {};
    for (const file of companions) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(file.name) || file.name.includes('..') || externalFiles['/' + file.name]) {
        reply({ type: 'error', error: 'UNSAFE_COMPANION_FILE' });
        return;
      }
    }

    window.EJS_player = '#game';
    window.EJS_core = d.core;
    window.EJS_gameName = d.name;
    window.EJS_pathtodata = '/cores/ejs-4.2.3/';
    window.EJS_DEBUG_XX = true;
    window.EJS_startOnLoaded = true;
    window.EJS_threads = d.core === 'ppsspp';
    window.EJS_disableDatabases = true;
    window.EJS_disableLocalStorage = true;
    window.EJS_disableAutoLang = true;
    window.EJS_language = 'en-US';
    window.EJS_volume = 0.4;
    window.EJS_color = '#9885f8';
    window.EJS_backgroundColor = '#10131d';
    // EmulatorJS maps genesis_plus_gx → segaMS first (buttons labeled "1"/"2").
    // Force Mega Drive / Game Gear schemes from ROM extension so controls match the family.
    const romName = String(d.name || d.file?.name || '').toLowerCase();
    const controlSchemeByCore = {
      genesis_plus_gx: romName.endsWith('.gg') ? 'segaGG' : 'segaMD',
      smsplus: 'segaMS',
      fceumm: 'nes',
      snes9x: 'snes',
      gambatte: 'gb',
      mgba: 'gba',
      pcsx_rearmed: 'psx',
      ppsspp: 'psp',
    };
    if (controlSchemeByCore[d.core]) {
      window.EJS_controlScheme = controlSchemeByCore[d.core];
    }
    // Rewind supplies its own TouchControls; EmulatorJS Fast/Slow virtual pads
    // on mobile can leave a stuck continuous tone on Android Chrome.
    window.EJS_defaultOptions = {
      webgl2Enabled: 'enabled',
      'virtual-gamepad': 'disabled',
      fastForward: 'disabled',
    };
    window.EJS_Buttons = {
      settings: { visible: false },
      netplay: { visible: false },
      saveState: { visible: false },
      loadState: { visible: false },
      saveSavFiles: { visible: false },
      loadSavFiles: { visible: false },
    };
    if (d.bios) {
      window.EJS_biosUrl = URL.createObjectURL(d.bios);
      urls.push(window.EJS_biosUrl);
    }
    window.EJS_onGameStart = () => {
      started = true;
      const emu = window.EJS_emulator;
      try {
        emu.changeSettingOption?.('virtual-gamepad', 'disabled');
        emu.changeSettingOption?.('fastForward', 'disabled');
        emu.toggleVirtualGamepad?.(false);
        if (emu.isFastForward) {
          emu.isFastForward = false;
          emu.gameManager?.toggleFastForward?.(0);
        }
      } catch {
        /* best-effort; launch still proceeds */
      }
      const gm = emu.gameManager;
      const seekable = seekableBridge?.stats?.() || null;
      reply({
        type: 'ready',
        capabilities: {
          saveState: !!gm.functions.supportsStates(),
          audio: true,
          analog: d.core === 'ppsspp' || d.core === 'pcsx_rearmed',
          seekableMedia: !!seekableBridge,
          onDemandMedia: !!(seekable && seekable.onDemand),
        },
      });
    };

    const boot = () => {
      if (preferSeekable(d.file, companions) && seekableReady()) {
        const files = { ['/' + d.file.name]: d.file };
        for (const file of companions) files['/' + file.name] = file;
        window.EJS_gameUrl = d.file.name;
        window.EJS_externalFiles = {};
        seekableBridge = window.RetroSeekableFS.installSeekableLoader(files, { core: d.core });
      } else {
        const total = [d.file, ...companions].reduce((sum, item) => sum + item.size, 0);
        if (total > 256 * 1024 * 1024) {
          reply({ type: 'error', error: 'LARGE_DISC_UNSUPPORTED' });
          return;
        }
        const url = URL.createObjectURL(d.file);
        urls.push(url);
        for (const file of companions) {
          const companionUrl = URL.createObjectURL(file);
          urls.push(companionUrl);
          externalFiles['/' + file.name] = companionUrl;
        }
        window.EJS_gameUrl = url;
        window.EJS_externalFiles = externalFiles;
      }
      const script = document.createElement('script');
      script.src = '/cores/ejs-4.2.3/loader.js';
      script.onerror = () => reply({ type: 'error', error: 'CORE_LOADER_FAILED' });
      document.body.append(script);
    };

    if (preferSeekable(d.file, companions)) {
      const seekable = document.createElement('script');
      seekable.src = '/runtime/seekable-fs.js';
      seekable.onload = boot;
      seekable.onerror = () => reply({ type: 'error', error: 'SEEKABLE_LOADER_FAILED' });
      document.head.append(seekable);
    } else {
      boot();
    }
    return;
  }
  if (d.session !== session || !started) return;
  const e = window.EJS_emulator,
    g = e.gameManager;
  if (d.type === 'input') {
    g.simulateInput(0, d.command, d.value);
    return;
  }
  if (d.type !== 'command') return;
  try {
    let value = null;
    switch (d.method) {
      case 'start':
      case 'resume':
        e.play();
        break;
      case 'pause':
        e.pause();
        break;
      case 'reset':
        g.restart();
        break;
      case 'volume':
        e.setVolume(Math.min(1, Math.max(0, d.value)));
        break;
      case 'save':
        value = g.getState();
        break;
      case 'load':
        g.loadState(new Uint8Array(d.value));
        break;
      case 'seekableStats':
        value = seekableBridge ? seekableBridge.stats() : null;
        break;
      default:
        throw new Error('UNSUPPORTED_OPERATION');
    }
    reply({ type: 'reply', id: d.id, value });
  } catch (error) {
    reply({ type: 'reply', id: d.id, error: String(error) });
  }
});
addEventListener('pagehide', revoke);
