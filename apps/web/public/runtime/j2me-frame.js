/**
 * Isolated js2me (MIT) J2ME runtime bridge — same postMessage protocol as dos-frame / frame.js.
 * Core code: js2me. JAR treated as untrusted bytecode; suite RMS isolated in IndexedDB.
 * Production: SHA-256 allowlist only (j2me-allowlist.json). Client allowUntrusted is ignored/removed.
 */
let session,
  started = false,
  midletId = null,
  rms = null,
  killTimer = 0,
  pressedKeys = new Set(),
  screenProfile = { width: 240, height: 320, label: '240x320' };

const SCREEN_PROFILES = {
  '128x160': { width: 128, height: 160 },
  '176x220': { width: 176, height: 220 },
  '240x320': { width: 240, height: 320 },
  '320x240': { width: 320, height: 240 },
};

const KEY_MAP = {
  4: -1,
  5: -2,
  6: -3,
  7: -4,
  0: -5,
  8: -5,
  3: -5,
  9: -6, // L soft
  1: -7, // R soft / select-ish
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

js2me.setFullscreen = function (enabled) {
  document.body.classList.toggle('j2me-fullscreen', !!enabled);
};

function applyScreenProfile(profile) {
  const p = SCREEN_PROFILES[profile] || SCREEN_PROFILES['240x320'];
  screenProfile = { ...p, label: profile in SCREEN_PROFILES ? profile : `${p.width}x${p.height}` };
  js2me.config.width = p.width;
  js2me.config.height = p.height;
  js2me.config.fullHeight = p.height;
  const screen = document.getElementById('screen');
  if (screen) {
    screen.style.width = `${p.width}px`;
    screen.style.height = `${p.height}px`;
  }
  document.documentElement.style.setProperty('--j2me-w', `${p.width}px`);
  document.documentElement.style.setProperty('--j2me-h', `${p.height}px`);
}

function releaseAllKeys() {
  for (const code of pressedKeys) {
    try {
      js2me.sendKeyReleasedEvent(code);
    } catch {
      /* ignore */
    }
  }
  pressedKeys.clear();
}

function pressKey(code) {
  if (!started) return;
  pressedKeys.add(code);
  js2me.sendKeyPressEvent(code);
}

function releaseKey(code) {
  if (!pressedKeys.has(code)) return;
  pressedKeys.delete(code);
  js2me.sendKeyReleasedEvent(code);
}

function wireKeypad() {
  const pad = document.getElementById('keypad');
  if (!pad) return;
  pad.querySelectorAll('button[data-key]').forEach((btn) => {
    const code = Number(btn.getAttribute('data-key'));
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      pressKey(code);
    });
    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      releaseKey(code);
    });
    btn.addEventListener('pointercancel', () => releaseKey(code));
    btn.addEventListener('lostpointercapture', () => releaseKey(code));
  });
}

function wireKeyboard(customMap) {
  const mapping = {
    38: -1,
    37: -3,
    39: -4,
    40: -2,
    32: -5,
    13: -5,
    81: -6, // Q = left soft
    69: -7, // E = right soft
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
    106: 42, // *
    107: 35, // # (approx)
    ...(customMap || {}),
  };
  document.addEventListener('keydown', (e) => {
    if (!started || mapping[e.which] == null) return;
    e.preventDefault();
    pressKey(mapping[e.which]);
  });
  document.addEventListener('keyup', (e) => {
    if (mapping[e.which] == null) return;
    e.preventDefault();
    releaseKey(mapping[e.which]);
  });
  window.addEventListener('blur', releaseAllKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAllKeys();
  });
  window.addEventListener('orientationchange', releaseAllKeys);
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
      // Form/List MIDlets may not use Canvas — accept any displayable child
      const screen = document.getElementById('screen');
      if (screen && screen.children.length > 0 && Date.now() - start > 400) {
        resolve(screen.firstElementChild);
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
  const secure = window.J2meSecure;
  await secure.loadAllowlist('/runtime/j2me-allowlist.json');
  // After allowlist fetch, lock network and fence storage.
  secure.installNetworkLockdown();
  secure.installStorageFence(window.J2meRmsIdb.DB_NAME);
  secure.wrapExecute();

  patchZipPaths();
  rms = window.J2meRmsIdb.create();
  js2me.rmsPersistence = rms;
  js2me.rmsQuotaBytes = 256 * 1024;
  js2me.kill = false;
  js2me.config.workers = false;

  const profile =
    options?.screenProfile ||
    (options?.width && options?.height ? `${options.width}x${options.height}` : '240x320');
  applyScreenProfile(profile);
  if (options?.width && options?.height && !SCREEN_PROFILES[profile]) {
    applyScreenProfile('240x320');
    js2me.config.width = Number(options.width);
    js2me.config.height = Number(options.height);
    js2me.config.fullHeight = Number(options.height);
  }

  const buffer = await file.arrayBuffer();
  // Intentionally ignore any client-supplied allowUntrusted / bypass flags.
  const validation = await secure.validateJarBuffer(buffer);

  document.body.classList.toggle('phone-frame', options?.phoneFrame !== false);

  await new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'application/java-archive' });
    const prevLaunchMidlet = js2me.launchMidlet;
    js2me.launchMidlet = async function (id) {
      try {
        if (!js2me.manifest?.['midlet-1'] || !js2me.manifest?.['midlet-name']) {
          throw new Error('JAR_NO_MIDLET');
        }
        const vendor = js2me.manifest['midlet-vendor'] || 'unknown';
        const name = js2me.manifest['midlet-name'] || 'unknown';
        const version = js2me.manifest['midlet-version'] || '0';
        // Suite identity for RMS: vendor/name/version (survives byte-identical rebuilds / hash churn).
        midletId = `${vendor}/${name}/${version}`;
        js2me.rmsMidletId = midletId;
        const snap = await rms.load(midletId);
        js2me.rmsSuite = snap && snap.stores ? snap : { stores: {} };
        secure.denyConnector();
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
      screen: { width: js2me.config.width, height: js2me.config.height, profile: screenProfile.label },
      jarSha256: validation.sha256,
      security: {
        networkDisabled: true,
        allowlistEnforced: true,
        sameOriginIframe: true,
        jarEntries: validation.entryCount,
      },
    },
  });
}

function cleanup() {
  releaseAllKeys();
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
  midletId = null;
}

addEventListener('message', async (event) => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const d = event.data;
  if (d.type === 'init' && !session) {
    session = d.session;
    try {
      wireKeypad();
      wireKeyboard(d.keyMap);
      await bootJar(d.file, {
        width: d.width,
        height: d.height,
        screenProfile: d.screenProfile,
        phoneFrame: d.phoneFrame,
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
    if (d.value === 1) pressKey(code);
    else releaseKey(code);
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
        releaseAllKeys();
        break;
      case 'reset':
        releaseAllKeys();
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
      case 'setScreenProfile': {
        const label = String(d.value || '240x320');
        applyScreenProfile(label);
        value = screenProfile;
        break;
      }
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
