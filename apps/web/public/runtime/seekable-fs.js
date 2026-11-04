/**
 * On-demand media VFS for EmulatorJS / Emscripten MEMFS.
 *
 * Strategy:
 * - Small files (< ON_DEMAND_THRESHOLD): stream into MEMFS in ≤8 MiB slices
 *   so the JavaScript heap never holds a full-file ArrayBuffer.
 * - Large files, or PS1/PSP/Dreamcast cores when SharedArrayBuffer is available:
 *   mount Blob-backed nodes that read windows through a dedicated worker into a
 *   SharedArrayBuffer. The WASM heap never receives a full-file copy at mount
 *   time; cores issue random-access reads through FS stream_ops.
 *
 * createLazyFile in the pinned cores requires ENVIRONMENT_IS_WORKER + sync
 * XHR, so it is not usable from the EmulatorJS iframe main thread. WORKERFS
 * is not compiled into the vendored cores. WasmFS/OPFS backends would need a
 * core rebuild; File objects from OPFS already work with this BlobFS path.
 * FileSystemSyncAccessHandle is used by the download worker for writes; the
 * blob-reader worker optionally accepts SyncAccessHandle registration for
 * reads when a handle is available.
 */
(function (global) {
  const PAYLOAD_BYTES = 8 * 1024 * 1024;
  const ON_DEMAND_THRESHOLD = 16 * 1024 * 1024;
  const SAB_HEADER = 16;
  const READ_TIMEOUT_MS = 60000;
  // Cores that must never MEMFS-copy disc media even when under the threshold.
  const ON_DEMAND_CORES = new Set(['ppsspp', 'pcsx_rearmed', 'flycast']);
  // Prefer playlist/cue sheets before single-disc images so multi-disc M3U
  // mounts keep disk-control aware of every companion image.
  const ENTRY_EXTS = [
    '.m3u',
    '.cue',
    '.gdi',
    '.cdi',
    '.chd',
    '.pbp',
    '.iso',
    '.cso',
    '.bin',
    '.elf',
  ];

  function assertReadRange(offset, length, size) {
    if (!Number.isFinite(offset) || !Number.isFinite(length)) {
      throw new Error('INVALID_READ_RANGE');
    }
    if (offset < 0 || length < 0) throw new Error('NEGATIVE_OFFSET_OR_LENGTH');
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length)) {
      throw new Error('OFFSET_OVERFLOW');
    }
    if (size != null && offset > size) throw new Error('OFFSET_PAST_EOF');
  }

  async function writeFileChunked(FS, absolutePath, file) {
    const size = file.size;
    if (size === 0) {
      FS.writeFile(absolutePath, new Uint8Array(0));
      return { bytesWritten: 0, peakPayload: 0, chunks: 0, mode: 'memfs-chunked' };
    }
    let peakPayload = 0;
    let chunks = 0;
    let offset = 0;
    const firstLen = Math.min(PAYLOAD_BYTES, size);
    const first = new Uint8Array(await file.slice(0, firstLen).arrayBuffer());
    peakPayload = first.length;
    chunks = 1;
    FS.writeFile(absolutePath, first);
    offset = first.length;
    if (offset >= size) return { bytesWritten: size, peakPayload, chunks, mode: 'memfs-chunked' };

    const stream = FS.open(absolutePath, 'r+');
    try {
      while (offset < size) {
        const end = Math.min(size, offset + PAYLOAD_BYTES);
        const piece = new Uint8Array(await file.slice(offset, end).arrayBuffer());
        if (piece.length > peakPayload) peakPayload = piece.length;
        chunks += 1;
        const written = FS.write(stream, piece, 0, piece.length, offset);
        if (written !== piece.length) throw new Error('SEEKABLE_SHORT_WRITE');
        offset += piece.length;
      }
    } finally {
      FS.close(stream);
    }
    return { bytesWritten: size, peakPayload, chunks, mode: 'memfs-chunked' };
  }

  async function readSlice(file, offset, length) {
    assertReadRange(offset, length, file.size);
    if (length > PAYLOAD_BYTES) throw new Error('SEEKABLE_READ_TOO_LARGE');
    if (offset >= file.size) return new Uint8Array(0);
    const end = Math.min(file.size, offset + length);
    return new Uint8Array(await file.slice(offset, end).arrayBuffer());
  }

  function ensureDirs(FS, absolutePath) {
    const parts = absolutePath.split('/').filter(Boolean);
    parts.pop();
    let current = '';
    for (const part of parts) {
      current += `/${part}`;
      if (!FS.analyzePath(current).exists) FS.mkdir(current);
    }
  }

  function createBlobReader() {
    if (typeof SharedArrayBuffer === 'undefined') return null;
    const sab = new SharedArrayBuffer(SAB_HEADER + PAYLOAD_BYTES);
    const control = new Int32Array(sab, 0, 4);
    const payload = new Uint8Array(sab, SAB_HEADER);
    let worker;
    try {
      worker = new Worker('/runtime/blob-reader.worker.js');
    } catch (error) {
      console.error('Blob reader worker unavailable', error);
      return null;
    }
    let nextId = 1;
    let ready = false;
    let generation = 0;
    let lastError = null;
    let disposed = false;
    const stats = {
      bytesRead: 0,
      peakPayload: 0,
      reads: 0,
      seeks: 0,
      spinMs: 0,
      lastLatencyMs: 0,
      totalLatencyMs: 0,
      outstanding: 0,
      lastOffset: 0,
    };
    const pendingReady = [];

    worker.onerror = (event) => {
      lastError = event.message || 'WORKER_ERROR';
      ready = false;
      while (pendingReady.length) pendingReady.shift()(new Error(lastError));
    };
    worker.onmessage = (event) => {
      const message = event.data || {};
      if (message.type === 'ready') {
        ready = true;
        generation = message.generation || generation;
        while (pendingReady.length) pendingReady.shift()(null);
      }
      if (message.type === 'error') lastError = message.error;
    };
    worker.postMessage({ type: 'init', sab });

    function waitReady() {
      if (disposed) throw new Error('BLOB_READER_DISPOSED');
      if (ready) return;
      throw new Error('BLOB_READER_NOT_READY');
    }

    function ensureReady() {
      if (disposed) return Promise.reject(new Error('BLOB_READER_DISPOSED'));
      if (ready) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('BLOB_READER_INIT_TIMEOUT')), 10000);
        pendingReady.push((error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      });
    }

    function acquire() {
      const start = performance.now();
      while (Atomics.compareExchange(control, 2, 0, 1) !== 0) {
        if (performance.now() - start > READ_TIMEOUT_MS) throw new Error('BLOB_LOCK_TIMEOUT');
      }
      stats.outstanding += 1;
    }

    function release() {
      stats.outstanding = Math.max(0, stats.outstanding - 1);
      Atomics.store(control, 2, 0);
    }

    function register(file) {
      waitReady();
      const id = nextId++;
      worker.postMessage({ type: 'register', id, file });
      return id;
    }

    /** Optional OPFS SyncAccessHandle registration (Dedicated Worker). */
    function registerHandle(handle, size) {
      waitReady();
      const id = nextId++;
      worker.postMessage({ type: 'registerHandle', id, handle, size });
      return id;
    }

    function unregister(id) {
      worker.postMessage({ type: 'unregister', id });
    }

    function readInto(id, offset, length, dest, destOffset) {
      assertReadRange(offset, length);
      if (length <= 0) return 0;
      if (length > PAYLOAD_BYTES) throw new Error('BLOB_READ_TOO_LARGE');
      waitReady();
      acquire();
      try {
        Atomics.store(control, 0, 0);
        Atomics.store(control, 1, 0);
        lastError = null;
        if (offset !== stats.lastOffset) stats.seeks += 1;
        stats.lastOffset = offset;
        const start = performance.now();
        worker.postMessage({ type: 'read', id, offset, length, generation });
        while (Atomics.load(control, 0) === 0) {
          if (lastError) throw new Error(lastError);
          if (disposed) throw new Error('BLOB_READER_DISPOSED');
          if (performance.now() - start > READ_TIMEOUT_MS) throw new Error('BLOB_READ_TIMEOUT');
        }
        const latency = performance.now() - start;
        stats.spinMs += latency;
        stats.lastLatencyMs = latency;
        stats.totalLatencyMs += latency;
        if (Atomics.load(control, 0) < 0) throw new Error(lastError || 'BLOB_READ_FAILED');
        const n = Atomics.load(control, 1);
        if (n > 0) dest.set(payload.subarray(0, n), destOffset || 0);
        stats.bytesRead += n;
        stats.reads += 1;
        if (n > stats.peakPayload) stats.peakPayload = n;
        return n;
      } finally {
        release();
      }
    }

    function readSync(id, offset, length) {
      assertReadRange(offset, length);
      if (length > PAYLOAD_BYTES) throw new Error('BLOB_READ_TOO_LARGE');
      const out = new Uint8Array(Math.max(0, length));
      const n = readInto(id, offset, out.length, out, 0);
      return n === out.length ? out : out.subarray(0, n);
    }

    function dispose() {
      disposed = true;
      ready = false;
      try {
        worker.postMessage({ type: 'dispose' });
      } catch {
        /* ignore */
      }
      try {
        worker.terminate();
      } catch {
        /* ignore */
      }
    }

    return {
      ensureReady,
      register,
      registerHandle,
      unregister,
      readInto,
      readSync,
      dispose,
      stats: () => ({ ...stats, generation, disposed }),
      sabByteLength: sab.byteLength,
    };
  }

  function createBlobBackedFile(FS, absolutePath, file, reader, mountStats) {
    ensureDirs(FS, absolutePath);
    const name = absolutePath.split('/').pop();
    const parentPath = absolutePath.slice(0, absolutePath.lastIndexOf('/')) || '/';
    if (FS.analyzePath(absolutePath).exists) FS.unlink(absolutePath);

    const id = reader.register(file);
    const contents = {
      length: file.size,
      chunkSize: PAYLOAD_BYTES,
      get(index) {
        if (index < 0 || index >= file.size) return undefined;
        const got = reader.readSync(id, index, 1);
        return got.length ? got[0] : undefined;
      },
    };

    const node = FS.createFile(parentPath, name, { isDevice: false, contents }, true, false);
    node.contents = contents;
    node.timestamp = Date.now();
    node.blobReaderId = id;
    Object.defineProperty(node, 'usedBytes', {
      get() {
        return file.size;
      },
    });

    function writeChunks(stream, buffer, offset, length, position) {
      assertReadRange(position, length, file.size);
      if (position >= file.size || length <= 0) return 0;
      let remaining = Math.min(length, file.size - position);
      let written = 0;
      while (remaining > 0) {
        const want = Math.min(PAYLOAD_BYTES, remaining);
        const dest =
          buffer instanceof Uint8Array
            ? buffer
            : new Uint8Array(buffer.buffer || buffer, buffer.byteOffset || 0, buffer.length || length);
        const n = reader.readInto(id, position + written, want, dest, offset + written);
        if (n <= 0) break;
        written += n;
        remaining -= n;
        mountStats.bytesRead += n;
        mountStats.reads += 1;
        if (n > mountStats.peakPayload) mountStats.peakPayload = n;
      }
      return written;
    }

    const streamOps = {};
    for (const key of Object.keys(node.stream_ops || {})) {
      const original = node.stream_ops[key];
      streamOps[key] = (...args) => original(...args);
    }
    streamOps.read = (stream, buffer, offset, length, position) =>
      writeChunks(stream, buffer, offset, length, position);
    streamOps.llseek = (stream, offset, whence) => {
      let position = offset;
      if (whence === 1) position += stream.position;
      else if (whence === 2) position += file.size;
      if (!Number.isFinite(position) || position < 0) throw new FS.ErrnoError(28);
      if (!Number.isSafeInteger(position)) throw new FS.ErrnoError(28);
      if (position !== stream.position) mountStats.seeks += 1;
      stream.position = position;
      return position;
    };
    streamOps.mmap = (stream, length, position) => {
      // Allow small mmaps (headers/probes). Reject multi-hundred-MiB maps so a
      // core cannot pull an entire disc into the WASM heap through mmap.
      if (length > 16 * 1024 * 1024) throw new FS.ErrnoError(48);
      const alloc = FS.mmapAlloc || global.mmapAlloc;
      const ptr = alloc ? alloc(length) : 0;
      if (!ptr) throw new FS.ErrnoError(48);
      const heap =
        (typeof global.GROWABLE_HEAP_U8 === 'function' && global.GROWABLE_HEAP_U8()) ||
        (typeof global.GROWABLE_HEAP_I8 === 'function' && global.GROWABLE_HEAP_I8()) ||
        global.HEAPU8 ||
        global.HEAP8;
      writeChunks(stream, heap, ptr, length, position);
      return { ptr, allocated: true };
    };
    streamOps.write = () => {
      throw new FS.ErrnoError(2);
    };
    node.stream_ops = streamOps;

    const nodeOps = Object.assign({}, node.node_ops);
    nodeOps.getattr = (n) => ({
      dev: 1,
      ino: n.id,
      mode: n.mode,
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      size: file.size,
      atime: new Date(n.timestamp),
      mtime: new Date(n.timestamp),
      ctime: new Date(n.timestamp),
      blksize: 4096,
      blocks: Math.ceil(file.size / 4096) || 1,
    });
    node.node_ops = nodeOps;
    return id;
  }

  // Tiny text sidecars must stay in MEMFS: RetroArch's M3U/CUE/GDI parsers
  // fread the whole sheet synchronously, and BlobFS windows can abort that path
  // ("failed to read m3u file"). Large binary media still use on-demand BlobFS.
  const MEMFS_SIDE_EXTS = new Set(['.m3u', '.cue', '.gdi', '.ccd', '.toc', '.lst']);

  function isMemfsSidecar(pathOrName) {
    const name = String(pathOrName || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    if (dot < 0) return false;
    return MEMFS_SIDE_EXTS.has(name.slice(dot));
  }

  function preferOnDemand(core, file, path, forceMemfsMedia) {
    if (typeof SharedArrayBuffer === 'undefined') return false;
    // Playlist/cue sheets stay in MEMFS (filestream_gets).
    if (isMemfsSidecar(path || file?.name)) return false;
    // Multi-disc adapter overwrites the boot path via FS.writeFile — requires MEMFS.
    if (forceMemfsMedia) return false;
    if (ON_DEMAND_CORES.has(core)) return true;
    return (file?.size || 0) >= ON_DEMAND_THRESHOLD;
  }

  function installSeekableLoader(filesByPath, options = {}) {
    const core = options.core || '';
    const forceMemfsOpt = !!options.forceMemfs;
    const stats = {
      bytesRead: 0,
      bytesWritten: 0,
      peakPayload: 0,
      payloadCapacity: PAYLOAD_BYTES,
      mounts: 0,
      chunks: 0,
      reads: 0,
      seeks: 0,
      mode: 'pending',
      onDemand: false,
      onDemandSkippedForM3u: false,
      forceMemfs: forceMemfsOpt,
      wasmHeapBefore: 0,
      wasmHeapAfterMount: 0,
      modes: [],
    };
    const registeredIds = [];
    let reader = null;

    const preferEntry = () => {
      const paths = Object.keys(filesByPath);
      for (const ext of ENTRY_EXTS) {
        const hit = paths.find((path) => path.toLowerCase().endsWith(ext));
        if (hit) return hit.startsWith('/') ? hit : `/${hit}`;
      }
      const first = paths[0];
      return first.startsWith('/') ? first : `/${first}`;
    };

    const measureHeap = (Module) => {
      try {
        if (Module?.HEAPU8?.length) return Module.HEAPU8.length;
        if (Module?.HEAP8?.length) return Module.HEAP8.length;
        if (Module?.wasmMemory?.buffer?.byteLength) return Module.wasmMemory.buffer.byteLength;
        if (Module?.asm?.memory?.buffer?.byteLength) return Module.asm.memory.buffer.byteLength;
      } catch {
        /* ignore */
      }
      return 0;
    };

    const apply = (EmulatorJS) => {
      EmulatorJS.prototype.downloadFiles = function patchedDownloadFiles() {
        (async () => {
          this.gameManager = new window.EJS_GameManager(this.Module, this);
          await this.gameManager.mountFileSystems();
          this.callEvent('saveDatabaseLoaded', this.gameManager.FS);
          if (this.getCore() === 'ppsspp') {
            await this.gameManager.loadPpssppAssets();
          }
          const FS = this.gameManager.FS;
          stats.wasmHeapBefore = measureHeap(this.Module);
          const activeCore = this.getCore() || core;

          const entries = Object.entries(filesByPath);
          const hasM3u = entries.some(([path]) => path.toLowerCase().endsWith('.m3u'));
          const totalBytes = entries.reduce((sum, [, file]) => sum + (file?.size || 0), 0);
          // forceMemfs: disc-swap adapter. hasM3u+small: legacy M3U content path.
          const forceMemfsMedia =
            forceMemfsOpt ||
            (hasM3u && totalBytes > 0 && totalBytes <= 32 * 1024 * 1024);
          stats.onDemandSkippedForM3u = forceMemfsMedia;
          const anyOnDemand = entries.some(([path, file]) =>
            preferOnDemand(activeCore, file, path, forceMemfsMedia),
          );
          if (anyOnDemand) {
            reader = createBlobReader();
            if (!reader) throw new Error('BLOB_READER_UNAVAILABLE');
            await reader.ensureReady();
            stats.onDemand = true;
          }

          for (const [path, file] of entries) {
            const absolute = path.startsWith('/') ? path : `/${path}`;
            if (preferOnDemand(activeCore, file, absolute, forceMemfsMedia) && reader) {
              const id = createBlobBackedFile(FS, absolute, file, reader, stats);
              registeredIds.push(id);
              stats.mounts += 1;
              stats.modes.push('blobfs-ondemand');
              stats.mode = 'blobfs-ondemand';
            } else if (isMemfsSidecar(absolute)) {
              // Exact UTF-8 write — RetroArch filestream_open/gets expects a normal MEMFS node.
              const text = await file.text();
              FS.writeFile(absolute, text);
              stats.bytesWritten += text.length;
              stats.mounts += 1;
              stats.modes.push('memfs-sidecar-utf8');
              if (stats.mode === 'pending') stats.mode = 'memfs-sidecar-utf8';
            } else {
              const result = await writeFileChunked(FS, absolute, file);
              stats.bytesWritten += result.bytesWritten;
              stats.chunks += result.chunks;
              stats.mounts += 1;
              if (result.peakPayload > stats.peakPayload) stats.peakPayload = result.peakPayload;
              stats.modes.push(result.mode);
              if (stats.mode === 'pending') stats.mode = result.mode;
            }
          }

          if (reader) {
            const readerStats = reader.stats();
            if (readerStats.peakPayload > stats.peakPayload) stats.peakPayload = readerStats.peakPayload;
          }

          stats.wasmHeapAfterMount = measureHeap(this.Module);
          const entryPath = preferEntry();
          this.fileName = entryPath.replace(/^\//, '');
          this.config.gameUrl = this.fileName;
          global.__RETRO_SEEKABLE_STATS__ = () => ({
            ...stats,
            reader: reader ? reader.stats() : null,
          });
          await this.downloadBios();
          await this.downloadStartState();
          await this.downloadGameParent();
          await this.downloadGamePatch();
          this.startGame();
        })().catch((error) => {
          console.error(error);
          this.startGameError(String(error?.message || error));
        });
      };
      return EmulatorJS;
    };

    let current = global.EmulatorJS;
    if (typeof current === 'function') apply(current);
    Object.defineProperty(global, 'EmulatorJS', {
      configurable: true,
      get() {
        return current;
      },
      set(Cls) {
        current = typeof Cls === 'function' ? apply(Cls) : Cls;
      },
    });

    return {
      stats: () => ({ ...stats, reader: reader ? reader.stats() : null }),
      dispose() {
        for (const id of registeredIds) {
          try {
            reader?.unregister(id);
          } catch {
            /* ignore */
          }
        }
        registeredIds.length = 0;
        reader?.dispose();
        reader = null;
      },
      PAYLOAD_BYTES,
      ON_DEMAND_THRESHOLD,
    };
  }

  global.RetroSeekableFS = {
    installSeekableLoader,
    writeFileChunked,
    readSlice,
    createBlobReader,
    preferOnDemand,
    PAYLOAD_BYTES,
    ON_DEMAND_THRESHOLD,
    ON_DEMAND_CORES: Array.from(ON_DEMAND_CORES),
  };
})(window);
