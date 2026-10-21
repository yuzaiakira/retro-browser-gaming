/**
 * Isolated js2me (MIT) J2ME runtime bridge — same postMessage protocol as dos-frame / frame.js.
 * Core code: js2me. JAR treated as untrusted bytecode; suite RMS isolated in IndexedDB.
 */
let session,
  started = false,
  midletId = null,
  rms = null,
  killTimer = 0;

const KEY_MAP = {
  // libretro-ish → MIDP keyCode (Canvas numeric / game keys)
  4: -1, // up
  5: -2, // down
  6: -3, // left
  7: -4, // right
  0: -5, // A / fire
  8: -5, // start → fire
  3: -5, // X → fire
};

const reply = (data) => parent.postMessage({ ...data, session }, location.origin);

js2me.showError = function (message) {
  const alertEl = document.getElementById('alert');
  if (!alertEl) {
    console.error('[js2me]', message);
    return;
  }
  alertEl.style.display = 'flex';
  const msg = alertEl.querySelector('.message');
  if (msg) msg.textContent = String(message);
  reply({ type: 'error', error: String(message) });
};

js2me.setFullscreen = function () {};

function wireKeypad() {
  const pad = document.getElementById('keypad');
  if (!pad) return;
  const press = (code) => {
    if (!started) return;
    js2me.sendKeyPressEvent(code);
  };
  const release = (code) => {
    if (!started) return;
    js2me.sendKeyReleasedEvent(code);
  };
  pad.querySelectorAll('button[data-key]').forEach((btn) => {
    const code = Number(btn.getAttribute('data-key'));
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      press(code);
    });
    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      release(code);
    });
    btn.addEventListener('pointerleave', () => release(code));
  });
}

function wireKeyboard() {
  const mapping = {
    38: -1,
    37: -3,
    39: -4,
    40: -2,
    32: -5,
    13: -5,
    48: 48,
    49: 49,
    50: 50,
    51: 51,
    52: 52,
    53: 53,
    54: 54,
    55: 55,
    56: 56,
    57: 57,
  };
  document.addEventListener('keydown', (e) => {
    if (!started || mapping[e.which] == null) return;
    e.preventDefault();
    js2me.sendKeyPressEvent(mapping[e.which]);
  });
  document.addEventListener('keyup', (e) => {
    if (!started || mapping[e.which] == null) return;
    e.preventDefault();
    js2me.sendKeyReleasedEvent(mapping[e.which]);
  });
}

async function sha256Hex(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function patchZipPaths() {
  if (typeof zip !== 'undefined') {
    zip.useWebWorkers = false;
    zip.workerScriptsPath = '/cores/js2me/js/zip/';
  }
  const orig = js2me.loadJAR;
  js2me.loadJAR = function (file, callback) {
    patchZipPaths();
    orig.call(js2me, file, callback);
  };
}

function waitForCanvas(timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const canvas = document.querySelector('#screen canvas');
      if (canvas && canvas.width > 0) {
        resolve(canvas);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('J2ME_CANVAS_TIMEOUT'));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

async function bootJar(file, options) {
  patchZipPaths();
  rms = window.J2meRmsIdb.create();
  js2me.rmsPersistence = rms;
  js2me.rmsQuotaBytes = 256 * 1024;
  js2me.kill = false;

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 4) throw new Error('JAR_TOO_SMALL');
  const magic = new Uint8Array(buffer, 0, 4);
  // ZIP local file header or empty JAR still starts with PK
  if (magic[0] !== 0x50 || magic[1] !== 0x4b) throw new Error('JAR_NOT_ZIP');

  const digest = await sha256Hex(buffer);
  const width = Number(options?.width) || 240;
  const height = Number(options?.height) || 320;
  js2me.config.width = width;
  js2me.config.height = height;
  js2me.config.fullHeight = height;

  await new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'application/java-archive' });
    // launchJAR loads the bytecode engine (program_zazu), then the JAR.
    const prevLaunchMidlet = js2me.launchMidlet;
    js2me.launchMidlet = async function (id) {
      try {
        const vendor = js2me.manifest['midlet-vendor'] || 'unknown';
        const name = js2me.manifest['midlet-name'] || 'unknown';
        midletId = `${vendor}/${name}/${digest.slice(0, 16)}`;
        js2me.rmsMidletId = midletId;
        const snap = await rms.load(midletId);
        js2me.rmsSuite = snap && snap.stores ? snap : { stores: {} };
        prevLaunchMidlet.call(js2me, id);
        await waitForCanvas(20000);
        started = true;
        js2me.launchMidlet = prevLaunchMidlet;
        resolve();
      } catch (e) {
        js2me.launchMidlet = prevLaunchMidlet;
        reject(e);
      }
    };
    try {
      js2me.loadScript(
        js2me.engine,
        () => {
          js2me.loadJAR(blob, () => {
            js2me.launchMidlet(js2me.config.midlet);
          });
        },
        () => reject(new Error('J2ME_ENGINE_LOAD_FAILED')),
      );
    } catch (e) {
      reject(e);
    }
  });

  reply({
    type: 'ready',
    capabilities: {
      saveState: false,
      audio: false,
      analog: false,
      seekableMedia: false,
      onDemandMedia: false,
      j2meRuntime: 'js2me',
      rms: true,
      midletId,
      screen: { width, height },
    },
  });
}

function cleanup() {
  js2me.kill = true;
  started = false;
  const screen = document.getElementById('screen');
  if (screen) screen.innerHTML = '';
  if (rms) {
    rms.close().catch(() => {});
    rms = null;
  }
  js2me.rmsSuite = { stores: {} };
  js2me.rmsMidletId = null;
  js2me.rmsPersistence = null;
}

addEventListener('message', async (event) => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const d = event.data;
  if (d.type === 'init' && !session) {
    session = d.session;
    try {
      wireKeypad();
      wireKeyboard();
      await bootJar(d.file, {
        width: d.width,
        height: d.height,
      });
    } catch (error) {
      reply({ type: 'error', error: String(error?.message || error) });
    }
    return;
  }
  if (d.session !== session) return;
  if (d.type === 'input') {
    if (!started) return;
    const code = KEY_MAP[d.command];
    if (code == null) return;
    if (d.value === 1) js2me.sendKeyPressEvent(code);
    else js2me.sendKeyReleasedEvent(code);
    return;
  }
  if (d.type !== 'command') return;
  try {
    let value = null;
    switch (d.method) {
      case 'start':
      case 'resume':
        break;
      case 'pause':
        break;
      case 'reset':
        break;
      case 'volume':
        break;
      case 'save':
        throw new Error('Save states unsupported; use MIDlet RMS');
      case 'load':
        throw new Error('Save states unsupported; use MIDlet RMS');
      case 'rmsSnapshot':
        value = midletId && rms ? await rms.load(midletId) : null;
        break;
      case 'dispose':
        cleanup();
        break;
      default:
        throw new Error(`Unknown command ${d.method}`);
    }
    reply({ type: 'reply', id: d.id, value });
  } catch (error) {
    reply({ type: 'reply', id: d.id, error: String(error?.message || error) });
  }
});

addEventListener('pagehide', () => {
  clearTimeout(killTimer);
  killTimer = setTimeout(cleanup, 0);
});
