/**
 * Bounded-memory media loader for EmulatorJS.
 *
 * EmulatorJS normally materialises the whole game as one ArrayBuffer, then
 * copies it into MEMFS. This module streams File/Blob bytes in ≤8 MiB slices
 * directly into the Emscripten FS so the JavaScript heap never holds a
 * full-file ArrayBuffer. Random-access proof helpers exercise the same
 * slice window without retaining the whole payload.
 *
 * Note: after load, RetroArch MEMFS still owns the bytes in the WASM heap —
 * that is required by the pinned cores. The PDR gate this satisfies is the
 * prohibition on building a JavaScript ArrayBuffer the size of the whole disc.
 */
(function (global) {
  const PAYLOAD_BYTES = 8 * 1024 * 1024;

  async function writeFileChunked(FS, absolutePath, file) {
    const size = file.size;
    if (size === 0) {
      FS.writeFile(absolutePath, new Uint8Array(0));
      return { bytesWritten: 0, peakPayload: 0, chunks: 0 };
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
    if (offset >= size) return { bytesWritten: size, peakPayload, chunks };

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
    return { bytesWritten: size, peakPayload, chunks };
  }

  async function readSlice(file, offset, length) {
    if (length > PAYLOAD_BYTES) throw new Error('SEEKABLE_READ_TOO_LARGE');
    if (offset >= file.size) return new Uint8Array(0);
    const end = Math.min(file.size, offset + length);
    return new Uint8Array(await file.slice(offset, end).arrayBuffer());
  }

  function installSeekableLoader(filesByPath) {
    const stats = { bytesRead: 0, bytesWritten: 0, peakPayload: 0, payloadCapacity: PAYLOAD_BYTES, mounts: 0, chunks: 0 };

    const preferEntry = () => {
      for (const path of Object.keys(filesByPath)) {
        const lower = path.toLowerCase();
        if (lower.endsWith('.cue') || lower.endsWith('.pbp') || lower.endsWith('.iso') || lower.endsWith('.cso') || lower.endsWith('.bin')) {
          return path.startsWith('/') ? path : `/${path}`;
        }
      }
      const first = Object.keys(filesByPath)[0];
      return first.startsWith('/') ? first : `/${first}`;
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
          for (const [path, file] of Object.entries(filesByPath)) {
            const absolute = path.startsWith('/') ? path : `/${path}`;
            const parts = absolute.split('/').filter(Boolean);
            parts.pop();
            let current = '';
            for (const part of parts) {
              current += `/${part}`;
              if (!FS.analyzePath(current).exists) FS.mkdir(current);
            }
            const result = await writeFileChunked(FS, absolute, file);
            stats.bytesWritten += result.bytesWritten;
            stats.chunks += result.chunks;
            stats.mounts += 1;
            if (result.peakPayload > stats.peakPayload) stats.peakPayload = result.peakPayload;
          }
          const entryPath = preferEntry();
          this.fileName = entryPath.replace(/^\//, '');
          this.config.gameUrl = this.fileName;
          global.__RETRO_SEEKABLE_STATS__ = () => ({ ...stats });
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
      stats: () => ({ ...stats }),
      dispose() {},
      PAYLOAD_BYTES,
    };
  }

  global.RetroSeekableFS = {
    installSeekableLoader,
    writeFileChunked,
    readSlice,
    PAYLOAD_BYTES,
  };
})(window);
