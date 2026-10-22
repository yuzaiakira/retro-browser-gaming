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

function preferSeekable(file, companions, core) {
  // Multi-file discs always use seekable VFS. A few EmulatorJS cores
  // only work reliably via blob URLs (input and/or ZIP mount for DOS).
  if (
    [
      'prosystem',
      'handy',
      'mednafen_ngp',
      'dosbox_pure',
      'a5200',
      'beetle_vb',
      'mupen64plus_next',
      'vice_x64sc',
      'fuse',
      'puae',
      '81',
      '81_eo',
      'cap32',
      'desmume',
      'virtualjaguar',
      'virtualjaguar_js',
    ].includes(core)
  ) {
    return false;
  }
  if ((companions || []).length > 0) return true;
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
    window.EJS_threads = d.core === 'ppsspp' || d.core === 'dosbox_pure';
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
      // SG-1000 ROMs (.sg) also use smsplus; EmulatorJS has no separate sg1000 scheme.
      smsplus: 'segaMS',
      fceumm: 'nes',
      snes9x: 'snes',
      gambatte: 'gb',
      mgba: 'gba',
      stella2014: 'atari2600',
      a5200: 'atari5200',
      beetle_vb: 'vb',
      mupen64plus_next: 'n64',
      // EJS getCores maps c64 → vice_x64sc; pin scheme so UI/tests stay stable.
      vice_x64sc: 'c64',
      // EJS 4.2.3 getCores() has no zxspectrum shortcut — use explicit fuse core.
      fuse: 'fuse',
      // getCores maps amiga → puae; pin scheme name for probes/UI.
      puae: 'amiga',
      // EJS 4.2.3 getCores() has no zx81 shortcut — use explicit 81 / 81_eo cores.
      '81': '81',
      '81_eo': '81',
      // EJS 4.2.3 getCores() has no cpc/amstrad shortcut — use explicit cap32 core.
      cap32: 'cap32',
      // Prefer desmume (HLE BIOS) over melonds (requires proprietary DS firmware).
      desmume: 'nds',
      // getCores maps jaguar → virtualjaguar; pin scheme for probes/UI.
      virtualjaguar: 'jaguar',
      virtualjaguar_js: 'jaguar',
      mednafen_pce: 'pce',
      mednafen_wswan: 'ws',
      prosystem: 'atari7800',
      handy: 'lynx',
      mednafen_ngp: 'ngp',
      pcsx_rearmed: 'psx',
      ppsspp: 'psp',
      dosbox_pure: 'dos',
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
    if (d.core === 'vice_x64sc') {
      // Without warp, D64 autostart stays on LOADING for tens of seconds.
      window.EJS_defaultOptions.vice_autoloadwarp = 'both';
      window.EJS_defaultOptions.vice_autostart_warp = 'enabled';
    }
    if (d.core === 'fuse') {
      window.EJS_defaultOptions.fuse_tape_traps = 'enabled';
      window.EJS_defaultOptions['fuse_load_sound'] = 'disabled';
    }
    if (d.core === 'puae') {
      // Prefer embedded AROS Kickstart; do not require proprietary kick*.rom.
      window.EJS_defaultOptions.puae_model = 'A500';
      window.EJS_defaultOptions['puae-model'] = 'A500';
    }
    if (d.core === '81' || d.core === '81_eo') {
      // 81_eo: independently versioned WASM calls eo_loadp for .p (tape path for .tzx).
      // Stock 81 still needs LOAD ""; keep face-button LOAD map for that path.
      // 81-libretro treats joypad "auto" as joymap 0 (dead) — pin explicit keys.
      // Use "default" (not digit strings) for D-Pad — matches upstream cursor map.
      window.EJS_defaultOptions['81_fast_load'] = 'enabled';
      window.EJS_defaultOptions['81_chroma_81'] = 'disabled';
      window.EJS_defaultOptions['81_joypad_up'] = 'default';
      window.EJS_defaultOptions['81_joypad_down'] = 'default';
      window.EJS_defaultOptions['81_joypad_left'] = 'default';
      window.EJS_defaultOptions['81_joypad_right'] = 'default';
      // B → R (RUN keyword at K cursor after eo_loadp); X → NEWLINE; A → P (Dot).
      window.EJS_defaultOptions['81_joypad_b'] = 'r';
      window.EJS_defaultOptions['81_joypad_a'] = 'p';
      window.EJS_defaultOptions['81_joypad_y'] = 'shift';
      window.EJS_defaultOptions['81_joypad_x'] = 'new line';
    }
    if (d.core === 'cap32') {
      // Cap32 autostarts DSK/CDT/M3U; CPC firmware is embedded in the core package.
      window.EJS_defaultOptions.cap32_model = '6128';
      window.EJS_defaultOptions['cap32-model'] = '6128';
    }
    if (d.core === 'desmume') {
      // Keep HLE BIOS/firmware (do not require proprietary bios7/bios9/firmware.bin).
      window.EJS_defaultOptions.desmume_use_external_bios = 'disabled';
      window.EJS_defaultOptions['desmume_pointer_type'] = 'touch';
      window.EJS_defaultOptions.desmume_pointer_type = 'touch';
    }
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
        // ZX81 keybovl needs RETRO_DEVICE_KEYBOARD / JOYPAD; enable RA keyboard feed.
        if (d.core === '81' || d.core === '81_eo') {
          emu.changeSettingOption?.('keyboardInput', 'enabled');
          emu.gameManager?.functions?.setKeyboardEnabled?.(1);
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
          analog:
            d.core === 'ppsspp' ||
            d.core === 'pcsx_rearmed' ||
            d.core === 'mupen64plus_next',
          seekableMedia: !!seekableBridge,
          onDemandMedia: !!(seekable && seekable.onDemand),
        },
      });
      // Stock 81: .p/.tzx as tape; LOAD "" via overlay or remapped face buttons.
      // 81_eo: .p uses eo_loadp (direct inject); .tzx/.t81 keep FlashLoad tape path.
    };

    const boot = () => {
      if (preferSeekable(d.file, companions, d.core) && seekableReady()) {
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

    if (preferSeekable(d.file, companions, d.core)) {
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
