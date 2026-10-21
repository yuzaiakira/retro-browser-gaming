/**
 * Hardening layer for the js2me runtime frame.
 * Production never bypasses the SHA-256 allowlist — there is no allowUntrusted flag.
 */
(function (global) {
  const LIMITS = {
    maxJarBytes: 8 * 1024 * 1024,
    maxEntries: 512,
    maxUncompressedBytes: 16 * 1024 * 1024,
    maxEntryUncompressed: 4 * 1024 * 1024,
    maxInstructionsPerSlice: 250000,
  };

  const RMS_DB = 'retro-j2me-rms';
  let allowlist = new Set();

  function hexFromBuffer(buf) {
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(buffer) {
    return hexFromBuffer(await crypto.subtle.digest('SHA-256', buffer));
  }

  function decodeName(bytes, start, len) {
    const raw = new TextDecoder('utf-8').decode(bytes.subarray(start, start + len));
    let name = raw;
    try {
      name = decodeURIComponent(raw.replace(/\+/g, '%20'));
    } catch {
      name = raw;
    }
    return { raw, name };
  }

  function assertSafeName(name) {
    if (!name || name.includes('\0')) throw new Error('JAR_BAD_NAME');
    const n = name.replace(/\\/g, '/');
    if (n.startsWith('/') || /^[a-zA-Z]:/.test(n)) throw new Error('JAR_PATH_TRAVERSAL');
    const parts = n.split('/');
    if (parts.some((p) => p === '..' || p === '.')) throw new Error('JAR_PATH_TRAVERSAL');
    if (/%2e%2e/i.test(name) || /%2f/i.test(name) || /%5c/i.test(name)) {
      throw new Error('JAR_PATH_TRAVERSAL');
    }
  }

  /**
   * Central-directory scan + local-header cross-check.
   * Rejects ZIP64, traversal, duplicates, and CD/local mismatches.
   */
  function inspectZip(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 22) throw new Error('JAR_TOO_SMALL');
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('JAR_NOT_ZIP');
    if (bytes.length > LIMITS.maxJarBytes) throw new Error('JAR_TOO_LARGE');

    // Reject ZIP64 end-of-central-directory locator
    for (let i = Math.max(0, bytes.length - 65557); i < bytes.length - 19; i++) {
      if (
        bytes[i] === 0x50 &&
        bytes[i + 1] === 0x4b &&
        bytes[i + 2] === 0x06 &&
        bytes[i + 3] === 0x07
      ) {
        throw new Error('JAR_ZIP64_UNSUPPORTED');
      }
    }

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
    if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
      throw new Error('JAR_ZIP64_UNSUPPORTED');
    }
    if (entryCount > LIMITS.maxEntries) throw new Error('JAR_TOO_MANY_ENTRIES');
    if (cdOffset + cdSize > bytes.length) throw new Error('JAR_CD_TRUNCATED');

    let uncompressedTotal = 0;
    let hasManifest = false;
    let offset = cdOffset;
    const names = [];
    const seen = new Set();

    for (let n = 0; n < entryCount; n++) {
      if (offset + 46 > bytes.length) throw new Error('JAR_CD_TRUNCATED');
      const sig = view.getUint32(offset, true);
      if (sig !== 0x02014b50) throw new Error('JAR_CD_BAD_SIG');
      const method = view.getUint16(offset + 10, true);
      const compSize = view.getUint32(offset + 20, true);
      const uncompSize = view.getUint32(offset + 24, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      if (compSize === 0xffffffff || uncompSize === 0xffffffff || localOffset === 0xffffffff) {
        throw new Error('JAR_ZIP64_UNSUPPORTED');
      }
      const nameStart = offset + 46;
      if (nameStart + nameLen > bytes.length) throw new Error('JAR_NAME_TRUNCATED');
      const { name } = decodeName(bytes, nameStart, nameLen);
      assertSafeName(name);
      if (seen.has(name)) throw new Error('JAR_DUPLICATE_ENTRY');
      seen.add(name);
      if (uncompSize > LIMITS.maxEntryUncompressed) throw new Error('JAR_ENTRY_TOO_LARGE');
      uncompressedTotal += uncompSize;
      if (uncompressedTotal > LIMITS.maxUncompressedBytes) throw new Error('JAR_UNCOMPRESSED_BOMB');
      if (name === 'META-INF/MANIFEST.MF' || name.toUpperCase() === 'META-INF/MANIFEST.MF') {
        hasManifest = true;
      }

      // Cross-check local file header
      if (localOffset + 30 > bytes.length) throw new Error('JAR_LOCAL_TRUNCATED');
      const localSig = view.getUint32(localOffset, true);
      if (localSig !== 0x04034b50) throw new Error('JAR_LOCAL_BAD_SIG');
      const localMethod = view.getUint16(localOffset + 8, true);
      const localComp = view.getUint32(localOffset + 18, true);
      const localUncomp = view.getUint32(localOffset + 22, true);
      const localNameLen = view.getUint16(localOffset + 26, true);
      const localExtraLen = view.getUint16(localOffset + 28, true);
      if (localNameLen !== nameLen) throw new Error('JAR_LOCAL_NAME_MISMATCH');
      const localNameStart = localOffset + 30;
      if (localNameStart + localNameLen > bytes.length) throw new Error('JAR_LOCAL_TRUNCATED');
      const localDecoded = decodeName(bytes, localNameStart, localNameLen).name;
      if (localDecoded !== name) throw new Error('JAR_LOCAL_NAME_MISMATCH');
      // When local sizes are zeroed (data descriptor flag), skip size equality
      const gpFlag = view.getUint16(localOffset + 6, true);
      const hasDataDescriptor = (gpFlag & 0x8) !== 0;
      if (!hasDataDescriptor) {
        if (localComp !== compSize || localUncomp !== uncompSize) {
          throw new Error('JAR_LOCAL_SIZE_MISMATCH');
        }
      }
      if (localMethod !== method) throw new Error('JAR_LOCAL_METHOD_MISMATCH');
      if (method !== 0 && method !== 8) throw new Error('JAR_METHOD_UNSUPPORTED');

      names.push({ name, compSize, uncompSize, method });
      offset = nameStart + nameLen + extraLen + commentLen;
      void localExtraLen;
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
      Object.defineProperty(global, 'fetch', {
        value: () => Promise.reject(new Error('J2ME_NETWORK_DISABLED')),
        configurable: false,
      });
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
    if (navigator && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon = function () {
        return false;
      };
    }
    try {
      global.open = function () {
        return null;
      };
    } catch {
      /* ignore */
    }
  }

  function installStorageFence(idbName) {
    const allowedDb = idbName || RMS_DB;
    const raw = global.localStorage;
    if (raw) {
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
        /* ignore */
      }
    }

    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = function (name, version) {
      if (name !== allowedDb) {
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
      return open(name, version);
    };

    // Best-effort: document.cookie stays same-origin readable; do not clear auth cookies.
    // Residual risk is documented — JS overrides are not a browser trust boundary.
  }

  function js2meStorageAllowed(key) {
    if (!key) return false;
    if (typeof js2me !== 'undefined' && js2me.storageName && String(key).startsWith(js2me.storageName)) {
      return true;
    }
    if (key === 'freeSpace' || key === 'height' || key === 'width' || key === 'fullHeight') {
      return false;
    }
    return false;
  }

  function patchConnectorDeny() {
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
    global.J2meSecure.wrapExecute = function wrapExecute() {
      if (!global.js2me || typeof js2me.execute !== 'function') return;
      if (js2me.execute.__j2meBudget) return;
      const inner = js2me.execute;
      js2me.execute = function (program, locals, constantPool, exceptions, restoreInfo, callback) {
        if (js2me.kill) return null;
        const content = program && program.content;
        js2me._instrBudget = (js2me._instrBudget || 0) + (content ? content.length : 1);
        if (js2me._instrBudget > LIMITS.maxInstructionsPerSlice * 40) {
          js2me.kill = true;
          throw new Error('J2ME_INSTRUCTION_BUDGET');
        }
        return inner.apply(this, arguments);
      };
      js2me.execute.__j2meBudget = true;
      setInterval(() => {
        if (js2me) js2me._instrBudget = 0;
      }, 1000);
    };
  }

  async function loadAllowlist(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('JAR_ALLOWLIST_LOAD_FAILED');
    const data = await res.json();
    const hashes = Array.isArray(data) ? data : data.sha256 || [];
    allowlist = new Set(hashes.map((h) => String(h).toLowerCase()));
    if (!allowlist.size) throw new Error('JAR_ALLOWLIST_EMPTY');
  }

  /** Production validation: always enforce allowlist. No bypass parameter. */
  async function validateJarBuffer(buffer) {
    const meta = inspectZip(buffer);
    const digest = await sha256Hex(buffer);
    if (!allowlist.size) throw new Error('JAR_ALLOWLIST_EMPTY');
    if (!allowlist.has(digest.toLowerCase())) throw new Error('JAR_NOT_ALLOWLISTED');
    return { ...meta, sha256: digest };
  }

  global.J2meSecure = {
    LIMITS,
    RMS_DB,
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
    /** Test-only helper for isolated inspectZip harnesses — not used by the frame. */
    _testSetAllowlist(hashes) {
      allowlist = new Set((hashes || []).map((h) => String(h).toLowerCase()));
    },
  };

  installExecutionBudget();
  patchConnectorDeny();
})(typeof window !== 'undefined' ? window : globalThis);
