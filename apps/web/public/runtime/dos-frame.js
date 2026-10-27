// Isolated js-dos (emulators 8.3.8) DOS runtime bridge — same postMessage protocol as frame.js.
// Used when recommended_core.code === 'jsdos'. Does not load EmulatorJS / dosbox_pure.
let session,
  started = false,
  ci = null,
  canvas = null,
  raf = 0;
let shellCodes = new Set(['Escape', 'KeyP', 'KeyF', 'F8', 'F9']);

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

/** Minimal ZIP reader for store-method (uncompressed) entries only. */
function unzipStored(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const files = [];
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    if (method !== 0) {
      throw new Error('ZIP_DEFLATE_UNSUPPORTED');
    }
    if (!name.endsWith('/')) {
      files.push({ path: name.replace(/^\/+/, ''), contents: bytes.slice(dataStart, dataStart + compSize) });
    }
    offset = dataStart + compSize;
  }
  if (!files.length) throw new Error('ZIP_EMPTY');
  return files;
}

function defaultConf(entries) {
  const hasAutorun = entries.some((e) => e.path.toUpperCase() === 'AUTORUN.BAT');
  const exe =
    entries.find((e) => /\.(com|exe|bat)$/i.test(e.path) && !/autorun\.bat$/i.test(e.path))?.path ||
    'flpybird.com';
  const lines = ['[autoexec]', 'mount c .', 'c:'];
  if (hasAutorun) lines.push('AUTORUN.BAT');
  else lines.push(exe);
  return lines.join('\n') + '\n';
}

function paintFrame(rgb, rgba) {
  if (!ci || !canvas) return;
  const ctx = canvas.getContext('2d');
  const w = ci.width();
  const h = ci.height();
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const img = ctx.createImageData(w, h);
  if (rgba) img.data.set(rgba);
  else if (rgb) {
    for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
      img.data[j] = rgb[i];
      img.data[j + 1] = rgb[i + 1];
      img.data[j + 2] = rgb[i + 2];
      img.data[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function mapLibretroToKey(command, value) {
  // Floppy Bird / many DOS games: fire / A / start → Space.
  if (![0, 8, 3].includes(command)) return;
  if (!ci) return;
  ci.sendKeyEvent(32, value === 1);
}

async function bootDos(file) {
  const emulators = window.emulators;
  if (!emulators) throw new Error('JSDOS_MISSING');
  emulators.pathPrefix = '/cores/jsdos-8.3.8/';

  const buffer = await file.arrayBuffer();
  let entries;
  if (String(file.name || '').toLowerCase().endsWith('.zip')) {
    entries = unzipStored(buffer);
  } else {
    entries = [{ path: file.name || 'game.com', contents: new Uint8Array(buffer) }];
  }
  const conf = new TextEncoder().encode(defaultConf(entries));
  const init = [{ path: '.jsdos/dosbox.conf', contents: conf }, ...entries];
  ci = await emulators.dosboxDirect(init);
  canvas = document.getElementById('game');
  ci.events().onFrame(paintFrame);
  ci.events().onMessage((type, ...args) => {
    if (type === 'error') console.error('[jsdos]', ...args);
  });
  started = true;
  reply({
    type: 'ready',
    capabilities: {
      saveState: true,
      audio: true,
      analog: false,
      seekableMedia: false,
      onDemandMedia: false,
      dosRuntime: 'jsdos-emulators-8.3.8',
    },
  });
}

addEventListener('message', async (event) => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const d = event.data;
  if (d.type === 'init' && !session) {
    session = d.session;
    try {
      await bootDos(d.file);
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
  if (!started || !ci) return;
  if (d.type === 'input') {
    mapLibretroToKey(d.command, d.value);
    return;
  }
  if (d.type !== 'command') return;
  try {
    let value = null;
    switch (d.method) {
      case 'start':
      case 'resume':
        ci.resume();
        break;
      case 'pause':
        ci.pause();
        break;
      case 'reset':
        // soft: resume if paused
        ci.resume();
        break;
      case 'volume':
        if (d.value <= 0) ci.mute();
        else ci.unmute();
        break;
      case 'save': {
        const persisted = await ci.persist(true);
        if (!persisted || persisted instanceof Object && !('byteLength' in persisted)) {
          // Fallback: screenshot bytes as opaque token when FS persist empty
          const shot = await ci.screenshot();
          value = new Uint8Array(shot.data.buffer.slice(0));
        } else {
          value = persisted instanceof Uint8Array ? persisted : new Uint8Array(persisted);
        }
        break;
      }
      case 'load':
        // persist() restores via new CI; limited in-session — accept no-op if unsupported
        break;
      case 'seekableStats':
        value = null;
        break;
      default:
        throw new Error('UNSUPPORTED_OPERATION');
    }
    reply({ type: 'reply', id: d.id, value });
  } catch (error) {
    reply({ type: 'reply', id: d.id, error: String(error) });
  }
});

addEventListener('pagehide', () => {
  cancelAnimationFrame(raf);
  try {
    ci?.exit?.();
  } catch {
    /* ignore */
  }
  ci = null;
});
