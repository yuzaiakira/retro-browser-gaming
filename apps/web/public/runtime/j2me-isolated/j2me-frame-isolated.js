/**
 * Dedicated-origin js2me bridge (PoC).
 * Parent must be a distinct origin; messages require parentOrigin + session.
 * RMS IndexedDB lives on this origin only — not the launcher origin.
 * Production: SHA-256 allowlist only. Client allowUntrusted is ignored.
 */
let session,
  parentOrigin = null,
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

const reply = (data) => {
  if (!parentOrigin) return;
  parent.postMessage({ ...data, session }, parentOrigin);
};

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
        sameOriginIframe: false,
        dedicatedOrigin: true,
        parentOrigin,
        frameOrigin: location.origin,
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

function assertParentOrigin(candidate) {
  if (typeof candidate !== 'string' || !/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(candidate)) {
    throw new Error('J2ME_BAD_PARENT_ORIGIN');
  }
  if (candidate === location.origin) {
    throw new Error('J2ME_PARENT_ORIGIN_NOT_DISTINCT');
  }
  return candidate;
}

function snapshotUpdatedAt(snap) {
  const at = snap?.meta?.updatedAt;
  return typeof at === 'number' && Number.isFinite(at) && at > 0 ? at : 0;
}

function snapshotRevision(snap) {
  const rev = snap?.meta?.revision;
  return typeof rev === 'number' && Number.isFinite(rev) && rev > 0 ? rev : 0;
}

function fingerprintSnapshot(snap) {
  return J2meRmsIdb.fingerprintStores(snap?.stores);
}

/**
 * Prefer newer target over stale source. Never silently clobber dedicated progress.
 * overwrite=true still will not replace a strictly newer target.
 */
function decideMergeAction(source, target) {
  if (!source?.stores) return 'keep-target';
  if (!target?.stores) return 'import-source';
  if (fingerprintSnapshot(source) === fingerprintSnapshot(target)) return 'equal';
  const srcAt = snapshotUpdatedAt(source);
  const tgtAt = snapshotUpdatedAt(target);
  if (srcAt > 0 || tgtAt > 0) {
    if (srcAt > tgtAt) return 'import-source';
    if (tgtAt > srcAt) return 'keep-target';
  }
  const srcRev = snapshotRevision(source);
  const tgtRev = snapshotRevision(target);
  if (srcRev > 0 || tgtRev > 0) {
    if (srcRev > tgtRev) return 'import-source';
    if (tgtRev > srcRev) return 'keep-target';
  }
  // Existing target without clocks: keep unless overwrite and no preferNewer opt-out.
  return 'conflict-keep-target';
}

/** Narrow RMS migration import — suite id + stores only, size-bounded. */
async function importMigratedRms(payload) {
  if (!rms) rms = J2meRmsIdb.create();
  if (!payload || typeof payload !== 'object') throw new Error('J2ME_MIGRATE_BAD_PAYLOAD');
  const suites = Array.isArray(payload.suites) ? payload.suites : [];
  if (suites.length > 16) throw new Error('J2ME_MIGRATE_TOO_MANY');
  const preferNewer = payload.preferNewer !== false;
  const imported = [];
  for (const entry of suites) {
    const id = String(entry?.midletId || '');
    if (!/^[A-Za-z0-9 ._+/-]{3,160}$/.test(id) || id.includes('..')) {
      throw new Error('J2ME_MIGRATE_BAD_ID');
    }
    const stores = entry?.snapshot?.stores;
    if (!stores || typeof stores !== 'object') throw new Error('J2ME_MIGRATE_BAD_STORES');
    const names = Object.keys(stores);
    if (names.length > 32) throw new Error('J2ME_MIGRATE_STORE_LIMIT');
    let bytes = 0;
    for (const name of names) {
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) throw new Error('J2ME_MIGRATE_BAD_STORE');
      const records = stores[name]?.records || {};
      for (const rec of Object.values(records)) {
        bytes += Array.isArray(rec) ? rec.length : rec?.byteLength || 0;
      }
    }
    if (bytes > 256 * 1024) throw new Error('J2ME_MIGRATE_TOO_LARGE');
    const existing = await rms.load(id);
    const sourceSnap = {
      stores: structuredClone(stores),
      meta: entry?.snapshot?.meta || undefined,
    };
    if (preferNewer) {
      const decision = decideMergeAction(sourceSnap, existing);
      if (decision !== 'import-source') {
        imported.push({ midletId: id, status: decision === 'equal' ? 'equal' : 'kept-existing', decision });
        continue;
      }
    } else if (existing && !payload.overwrite) {
      imported.push({ midletId: id, status: 'kept-existing', decision: 'keep-target' });
      continue;
    }
    await rms.save(id, sourceSnap);
    imported.push({ midletId: id, status: 'imported', decision: 'import-source' });
  }
  return { imported, frameOrigin: location.origin };
}

async function exportAllRms() {
  if (!rms) rms = J2meRmsIdb.create();
  const suites = await rms.listAll();
  return {
    frameOrigin: location.origin,
    suites: suites.map((s) => ({
      midletId: s.midletId,
      snapshot: s.snapshot,
      byteSize: (() => {
        let bytes = 0;
        for (const store of Object.values(s.snapshot.stores || {})) {
          for (const rec of Object.values(store.records || {})) {
            bytes += Array.isArray(rec) ? rec.length : rec?.byteLength || 0;
          }
        }
        return bytes;
      })(),
    })),
  };
}

addEventListener('message', async (event) => {
  if (event.source !== parent) return;
  const d = event.data;
  if (!d || typeof d !== 'object') return;

  if (d.type === 'init' && !session) {
    try {
      parentOrigin = assertParentOrigin(d.parentOrigin || event.origin);
      if (event.origin !== parentOrigin) throw new Error('J2ME_PARENT_ORIGIN_MISMATCH');
      session = d.session;
      if (!session || typeof session !== 'string') throw new Error('J2ME_BAD_SESSION');
      wireKeypad();
      wireKeyboard(d.keyMap);
      await bootJar(d.file, {
        width: d.width,
        height: d.height,
        screenProfile: d.screenProfile,
        phoneFrame: d.phoneFrame,
      });
    } catch (error) {
      // Best-effort error if parentOrigin known
      if (!parentOrigin) {
        try {
          parentOrigin = event.origin;
        } catch {
          /* ignore */
        }
      }
      reply({ type: 'error', error: String(error?.message || error) });
    }
    return;
  }

  if (!parentOrigin || event.origin !== parentOrigin) return;
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
      case 'importRmsMigration':
        value = await importMigratedRms(d.value);
        break;
      case 'exportRmsMigration':
        value = await exportAllRms();
        break;
      case 'probeIsolation':
        value = await probeIsolation();
        break;
      case 'setScreenProfile': {
        const label = String(d.value || '240x320');
        applyScreenProfile(label);
        value = screenProfile;
        break;
      }
      case 'dispose':
        cleanup();
        value = { disposed: true };
        break;
      default:
        throw new Error(`Unknown command ${d.method}`);
    }
    reply({ type: 'reply', id: d.id, value });
    if (d.method === 'dispose') {
      parentOrigin = null;
      session = null;
    }
  } catch (error) {
    reply({ type: 'reply', id: d.id, error: String(error?.message || error) });
  }
});

async function probeIsolation() {
  let launcherIdb = 'blocked-or-missing';
  try {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('retro-launcher-probe', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
    });
    // Opening a new DB on this origin is expected; prove we cannot see launcher DBs by name listing.
    launcherIdb = await new Promise((resolve) => {
      if (!indexedDB.databases) {
        resolve('databases-api-unavailable');
        return;
      }
      indexedDB.databases().then((dbs) => {
        const names = (dbs || []).map((d) => d.name);
        resolve({
          hasLauncherAuth: names.includes('retro-auth'),
          hasLauncherDb: names.includes('retro-browser-gaming'),
          names,
        });
      }, () => resolve('databases-api-failed'));
    });
  } catch (e) {
    launcherIdb = String(e?.message || e);
  }

  let parentDom = null;
  try {
    parentDom = parent.document?.title || 'reachable';
  } catch (e) {
    parentDom = `blocked:${e?.name || 'Error'}`;
  }

  let cookieJar = null;
  try {
    cookieJar = document.cookie || '';
  } catch {
    cookieJar = 'unreadable';
  }

  return {
    frameOrigin: location.origin,
    parentOrigin,
    parentDom,
    cookieJar,
    launcherIdb,
    canFetchParent: false,
  };
}

addEventListener('pagehide', () => {
  clearTimeout(killTimer);
  killTimer = setTimeout(cleanup, 0);
});
