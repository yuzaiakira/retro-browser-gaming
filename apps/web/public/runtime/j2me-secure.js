/**
 * Hardening layer for the js2me runtime frame.
 * Loaded before j2me-frame.js. Does not replace the VM; constrains untrusted JARs.
 */
(function (global) {
  const LIMITS = {
    maxJarBytes: 8 * 1024 * 1024,
    maxEntries: 512,
    maxUncompressedBytes: 16 * 1024 * 1024,
    maxEntryUncompressed: 4 * 1024 * 1024,
    maxInstructionsPerSlice: 250000,
    maxSlicesBeforeYieldCheck: 1,
  };

  /** SHA-256 allowlist of catalog / engineering fixtures. Empty → deny all unless allowUntrusted. */
  let allowlist = new Set();

  function hexFromBuffer(buf) {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(buffer) {
    return hexFromBuffer(await crypto.subtle.digest('SHA-256', buffer));
  }

  /**
   * Lightweight ZIP central-directory scan without full inflate.
   * Rejects traversal, absolute paths, and aggregate size bombs.
   */
  function inspectZip(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 22) throw new Error('JAR_TOO_SMALL');
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('JAR_NOT_ZIP');
    if (bytes.length > LIMITS.maxJarBytes) throw new Error('JAR_TOO_LARGE');

    // Find End of Central Directory
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('JAR_EOCD_MISSING');

    const view = new DataView(buffer);
    const entryCount = view.getUint16(eocd + 10, true);
    const cdSize = view.getUint32(eocd + 12, true);
    const cdOffset = view.getUint32(eocd + 16, true);
    if (entryCount > LIMITS.maxEntries) throw new Error('JAR_TOO_MANY_ENTRIES');
    if (cdOffset + cdSize > bytes.length) throw new Error('JAR_CD_TRUNCATED');

    let uncompressedTotal = 0;
    let hasManifest = false;
    let offset = cdOffset;
    const names = [];
    for (let n = 0; n < entryCount; n++) {
      if (offset + 46 > bytes.length) throw new Error('JAR_CD_TRUNCATED');
      const sig = view.getUint32(offset, true);
      if (sig !== 0x02014b50) throw new Error('JAR_CD_BAD_SIG');
      const compSize = view.getUint32(offset + 20, true);
      const uncompSize = view.getUint32(offset + 24, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const nameStart = offset + 46;
      if (nameStart + nameLen > bytes.length) throw new Error('JAR_NAME_TRUNCATED');
      const name = new TextDecoder('utf-8').decode(bytes.subarray(nameStart, nameStart + nameLen));
      if (!name || name.includes('\0')) throw new Error('JAR_BAD_NAME');
      if (name.startsWith('/') || name.startsWith('\\') || name.includes('..')) {
        throw new Error('JAR_PATH_TRAVERSAL');
      }
      if (uncompSize > LIMITS.maxEntryUncompressed) throw new Error('JAR_ENTRY_TOO_LARGE');
      uncompressedTotal += uncompSize;
      if (uncompressedTotal > LIMITS.maxUncompressedBytes) throw new Error('JAR_UNCOMPRESSED_BOMB');
      if (name === 'META-INF/MANIFEST.MF' || name === 'META-INF/MANIFEST.mf') hasManifest = true;
      names.push({ name, compSize, uncompSize });
      offset = nameStart + nameLen + extraLen + commentLen;
    }
    if (!hasManifest) throw new Error('JAR_MANIFEST_MISSING');
    return { entryCount, uncompressedTotal, names };
  }

  function parseManifestRequiresMidlet(text) {
    const lower = {};
    for (const line of String(text).split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx < 1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      lower[key] = line.slice(idx + 1).trim();
    }
    if (!lower['midlet-1']) throw new Error('JAR_NO_MIDLET');
    if (!lower['midlet-name']) throw new Error('JAR_NO_MIDLET_NAME');
    return lower;
  }

  function installNetworkLockdown() {
    const deny = () => {
      throw new Error('J2ME_NETWORK_DISABLED');
    };
    try {
      Object.defineProperty(global, 'fetch', { value: () => Promise.reject(new Error('J2ME_NETWORK_DISABLED')), configurable: true });
    } catch {
      global.fetch = () => Promise.reject(new Error('J2ME_NETWORK_DISABLED'));
    }
    global.XMLHttpRequest = function BlockedXHR() {
      deny();
    };
    global.WebSocket = function BlockedWS() {
      deny();
    };
    if (global.EventSource) {
      global.EventSource = function BlockedES() {
        deny();
      };
    }
  }

  function installStorageFence(idbName) {
    // Fence localStorage: MIDlet / js2me may only touch keys under suite prefix once set.
    const raw = global.localStorage;
    if (!raw) return;
    const fence = {
      getItem(key) {
        if (js2meStorageAllowed(key)) return raw.getItem(key);
        return null;
      },
      setItem(key, value) {
        if (!js2meStorageAllowed(key)) throw new Error('J2ME_STORAGE_FENCED');
        return raw.setItem(key, value);
      },
      removeItem(key) {
        if (!js2meStorageAllowed(key)) return;
        return raw.removeItem(key);
      },
      clear() {
        throw new Error('J2ME_STORAGE_FENCED');
      },
      key(i) {
        return raw.key(i);
      },
      get length() {
        return raw.length;
      },
    };
    try {
      Object.defineProperty(global, 'localStorage', { get: () => fence, configurable: true });
    } catch {
      /* ignore if non-configurable */
    }
    // Keep IDB open only for the dedicated RMS database name.
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = function (name, version) {
      if (name !== idbName && name !== 'js2me') {
        // Block js2me FileConnection DB and any other DB names.
        const req = {
          result: null,
          error: new DOMException('J2ME_IDB_FENCED', 'SecurityError'),
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          readyState: 'done',
        };
        queueMicrotask(() => {
          if (typeof req.onerror === 'function') req.onerror({ target: req });
        });
        return req;
      }
      if (name === 'js2me') {
        // FileConnection uses DB "js2me" — deny by opening unused name that fails policy
        const req = {
          result: null,
          error: new DOMException('J2ME_FILE_IDB_DISABLED', 'SecurityError'),
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          readyState: 'done',
        };
        queueMicrotask(() => {
          if (typeof req.onerror === 'function') req.onerror({ target: req });
        });
        return req;
      }
      return open(name, version);
    };
  }

  function js2meStorageAllowed(key) {
    if (!key) return false;
    // Method-safety cache keys used by js2me methodStub
    if (typeof js2me !== 'undefined' && js2me.storageName && String(key).startsWith(js2me.storageName)) {
      return true;
    }
    // Deny freeSpace / global height keys that leak across suites
    if (key === 'freeSpace' || key === 'height' || key === 'width' || key === 'fullHeight') {
      return false;
    }
    return false;
  }

  function patchConnectorDeny() {
    // Applied after ME classes load via hook from j2me-frame.
    global.J2meSecure.denyConnector = function denyConnector() {
      if (!global.javaRoot?.$javax?.$microedition?.$io?.$Connector) return;
      const proto = javaRoot.$javax.$microedition.$io.$Connector.prototype;
      const block = function () {
        throw new javaRoot.$java.$lang.$SecurityException
          ? new javaRoot.$java.$lang.$SecurityException('Connector disabled')
          : new Error('J2ME_CONNECTOR_DISABLED');
      };
      proto.$open$Ljava_lang_String_$Ljavax_microedition_io_Connection_ = block;
      proto.$open$Ljava_lang_String_I$Ljavax_microedition_io_Connection_ = block;
      proto.$open$Ljava_lang_String_IZ$Ljavax_microedition_io_Connection_ = block;
    };
  }

  function installExecutionBudget() {
    const origExecute = () => {};
    global.J2meSecure.wrapExecute = function wrapExecute() {
      if (!global.js2me || typeof js2me.execute !== 'function') return;
      if (js2me.execute.__j2meBudget) return;
      const inner = js2me.execute;
      js2me.execute = function (program, locals, constantPool, exceptions, restoreInfo, callback) {
        if (js2me.kill) return null;
        // Cooperative slice: if content is huge, rely on existing suspend; add instruction counter.
        const content = program && program.content;
        if (content && content.length > LIMITS.maxInstructionsPerSlice) {
          // Soft guard: still run but mark for kill if VM exceeds wall time via j2me.kill from frame.
        }
        js2me._instrBudget = (js2me._instrBudget || 0) + (content ? content.length : 1);
        if (js2me._instrBudget > LIMITS.maxInstructionsPerSlice * 40) {
          js2me.kill = true;
          throw new Error('J2ME_INSTRUCTION_BUDGET');
        }
        return inner.apply(this, arguments);
      };
      js2me.execute.__j2meBudget = true;
      // Reset budget periodically so long games can run
      setInterval(() => {
        if (js2me) js2me._instrBudget = 0;
      }, 1000);
      void origExecute;
    };
  }

  async function loadAllowlist(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const hashes = Array.isArray(data) ? data : data.sha256 || [];
      allowlist = new Set(hashes.map((h) => String(h).toLowerCase()));
    } catch {
      /* allowlist file optional during early boot; frame will fail closed if empty + !allowUntrusted */
    }
  }

  async function validateJarBuffer(buffer, { allowUntrusted = false } = {}) {
    const meta = inspectZip(buffer);
    const digest = await sha256Hex(buffer);
    if (!allowUntrusted) {
      if (!allowlist.size) {
        // Fail closed: require allowlist when untrusted disabled
        throw new Error('JAR_ALLOWLIST_EMPTY');
      }
      if (!allowlist.has(digest.toLowerCase())) {
        throw new Error('JAR_NOT_ALLOWLISTED');
      }
    }
    return { ...meta, sha256: digest };
  }

  // Boot fencing early (before MIDlet). Allowlist fetch uses real fetch before lockdown.
  global.J2meSecure = {
    LIMITS,
    sha256Hex,
    inspectZip,
    parseManifestRequiresMidlet,
    validateJarBuffer,
    loadAllowlist,
    installNetworkLockdown,
    installStorageFence,
    installExecutionBudget,
    patchConnectorDeny,
    getAllowlistSize: () => allowlist.size,
    addAllowlistHash: (h) => allowlist.add(String(h).toLowerCase()),
  };

  installExecutionBudget();
  patchConnectorDeny();
})(typeof window !== 'undefined' ? window : globalThis);
