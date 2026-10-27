import type { EmulatorAdapter, RuntimeCapabilities } from './contracts';
import {
  J2ME_FRAME_PATH,
  j2meDedicatedEnabled,
  j2meRuntimeOrigin,
  launcherOrigin,
} from './j2me-origin';
import {
  parseShellKeyDetail,
  type ShellKeyDetail,
} from '../features/player-shortcuts';

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/** '*' (or empty) allows any frame origin; otherwise require an exact match. */
export function isAllowedMessageOrigin(targetOrigin: string, eventOrigin: string): boolean {
  if (!targetOrigin || targetOrigin === '*') return true;
  return eventOrigin === targetOrigin;
}

export class FrameAdapter implements EmulatorAdapter {
  capabilities: RuntimeCapabilities = { saveState: false, audio: false, analog: false };
  private frame: HTMLIFrameElement;
  private session = crypto.randomUUID();
  private count = 0;
  private pending = new Map<number, Pending>();
  private urls: string[] = [];
  private ready: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (e: Error) => void;
  private timer: ReturnType<typeof setTimeout>;
  private targetOrigin: string = '';
  private disposed = false;
  private core = '';
  private shellKeyHandler: ((detail: ShellKeyDetail) => void) | null = null;

  constructor(
    container: HTMLElement,
    private native: boolean,
  ) {
    this.frame = document.createElement('iframe');
    this.frame.title = native ? 'HTML5 game' : 'WebAssembly emulator';
    this.frame.allow = 'autoplay; fullscreen; gamepad';
    this.frame.setAttribute(
      'sandbox',
      native ? 'allow-scripts' : 'allow-scripts allow-same-origin',
    );
    this.frame.className = 'game-frame';
    this.frame.dataset.runtimeSession = this.session;
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.timer = setTimeout(
      () => this.readyReject(new Error('Runtime boot timed out. Check core/game compatibility.')),
      90000,
    );
    window.addEventListener('message', this.onMessage);
    container.append(this.frame);
  }

  runtimeSessionId() {
    return this.session;
  }

  runtimeFrame() {
    return this.disposed ? null : this.frame;
  }

  setShellKeyHandler(handler: ((detail: ShellKeyDetail) => void) | null) {
    this.shellKeyHandler = handler;
  }

  async setShellShortcutCodes(codes: string[]) {
    const cleaned = codes.filter(
      (c) => typeof c === 'string' && c.length > 0 && c.length <= 40 && c !== 'F5',
    );
    if (this.native) {
      // Dedicated message type — native fixtures ignore unknown `command` methods.
      this.post({ type: 'setShellKeys', session: this.session, value: cleaned });
      return;
    }
    await this.call('setShellKeys', cleaned);
  }

  private onMessage = (event: MessageEvent) => {
    if (this.disposed) return;
    if (event.source !== this.frame.contentWindow) return;
    // Native HTML uses sandboxed blob: frames (opaque origin "null") and sets
    // targetOrigin to '*' as an allow-any sentinel for postMessage.
    if (!isAllowedMessageOrigin(this.targetOrigin, event.origin)) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.session !== this.session) return;
    if (data.type === 'ready') {
      this.capabilities = data.capabilities;
      clearTimeout(this.timer);
      this.readyResolve();
    }
    if (data.type === 'error') {
      clearTimeout(this.timer);
      this.readyReject(new Error(data.error));
    }
    if (data.type === 'shell-key') {
      const detail = parseShellKeyDetail(data);
      if (detail && detail.code !== 'F5') {
        this.shellKeyHandler?.(detail);
      }
      return;
    }
    if (data.type === 'reply') {
      const entry = this.pending.get(data.id);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(data.id);
        if (data.error) entry.reject(new Error(data.error));
        else entry.resolve(data.value);
      }
    }
  };

  async load(
    file: File,
    options: { core: string; name: string; bios?: File; companions?: File[] },
  ) {
    this.core = options.core;
    if (this.native) {
      const html = await file.text();
      // Trusted first-party bridge only — session-scoped shell shortcut forwarder.
      // Does not weaken sandbox; messages still require matching RETRO_SESSION.
      const sessionScript = `<script>window.RETRO_SESSION=${JSON.stringify(this.session)};(function(){var codes=new Set(['Escape','KeyP','KeyF','F8','F9']);function editable(t){return!!(t&&t.closest&&(t.isContentEditable||t.closest('input,select,textarea,[contenteditable="true"]')));}addEventListener('message',function(ev){var d=ev.data;if(!d||d.session!==window.RETRO_SESSION)return;if(d.type==='setShellKeys'&&Array.isArray(d.value)){codes=new Set(d.value.filter(function(c){return typeof c==='string'&&c.length&&c.length<=40&&c!=='F5';}));}});addEventListener('keydown',function(e){if(editable(e.target))return;if(!(codes.has(e.code)||e.key==='Escape'))return;if(e.code==='F5')return;e.preventDefault();e.stopPropagation();parent.postMessage({type:'shell-key',session:window.RETRO_SESSION,code:e.code,key:e.key,ctrlKey:!!e.ctrlKey,altKey:!!e.altKey,metaKey:!!e.metaKey,shiftKey:!!e.shiftKey,repeat:!!e.repeat,isComposing:!!e.isComposing},'*');},true);})();<\/script>`;
      const url = URL.createObjectURL(
        new Blob([html.replace('<script>', sessionScript + '<script>')], { type: 'text/html' }),
      );
      this.urls.push(url);
      this.frame.src = url;
      this.targetOrigin = '*';
    } else {
      const dedicated = options.core === 'js2me' && j2meDedicatedEnabled();
      const j2meOrigin = dedicated ? j2meRuntimeOrigin() : null;
      if (dedicated && !j2meOrigin) {
        throw new Error('J2ME_DEDICATED_ORIGIN_UNCONFIGURED');
      }
      if (options.core === 'jsdos') {
        this.frame.src = '/runtime/dos-frame.html';
        this.targetOrigin = location.origin;
      } else if (options.core === 'js2me' && j2meOrigin) {
        this.frame.src = `${j2meOrigin}${J2ME_FRAME_PATH}`;
        this.targetOrigin = j2meOrigin;
      } else if (options.core === 'js2me') {
        this.frame.src = '/runtime/j2me-frame.html';
        this.targetOrigin = location.origin;
      } else {
        this.frame.src = '/runtime/frame.html';
        this.targetOrigin = location.origin;
      }
      await new Promise<void>((resolve, reject) => {
        this.frame.onload = () => resolve();
        this.frame.onerror = () => reject(new Error('Frame unavailable'));
      });
      // Never forward allowUntrusted or other client bypass flags.
      const init: Record<string, unknown> = {
        type: 'init',
        session: this.session,
        file,
        bios: options.bios,
        companions: options.companions ?? [],
        core: options.core,
        name: options.name,
      };
      if (options.core === 'js2me' && j2meOrigin) {
        init.parentOrigin = launcherOrigin();
      }
      this.frame.contentWindow!.postMessage(init, this.targetOrigin === '*' ? '*' : this.targetOrigin);
    }
    await this.ready;
  }

  private post(payload: object) {
    if (this.disposed) throw new Error('Runtime disposed');
    const target = this.native ? '*' : this.targetOrigin || location.origin;
    this.frame.contentWindow?.postMessage(payload, target);
  }

  private call(method: string, value?: unknown) {
    const id = ++this.count;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.post({ type: 'command', session: this.session, id, method, value });
    });
  }

  /** Bounded-memory seekable mount statistics from the isolated frame, when available. */
  async seekableStats() {
    return this.call('seekableStats') as Promise<{
      bytesRead: number;
      peakPayload: number;
      payloadCapacity: number;
      mounts: number;
    } | null>;
  }

  async importRmsMigration(payload: unknown) {
    if (this.core !== 'js2me') throw new Error('RMS migration is J2ME-only');
    return this.call('importRmsMigration', payload);
  }

  /** Export all suite snapshots from the dedicated-origin frame (rollback / audit). */
  async exportRmsMigration() {
    if (this.core !== 'js2me') throw new Error('RMS export is J2ME-only');
    return this.call('exportRmsMigration');
  }

  async start() {
    await this.call('start');
  }
  async pause() {
    await this.call('pause');
  }
  async resume() {
    await this.call('resume');
  }
  async reset() {
    await this.call('reset');
  }
  async setVolume(value: number) {
    await this.call('volume', value);
  }
  input(command: number, value: number) {
    this.post({ type: 'input', session: this.session, command, value });
  }
  async exportState() {
    if (!this.capabilities.saveState) throw new Error('Save states unsupported');
    const bytes = await this.call('save');
    return new Uint8Array(bytes as ArrayBuffer);
  }
  async importState(bytes: Uint8Array) {
    if (!this.capabilities.saveState) throw new Error('Save states unsupported');
    await this.call('load', bytes);
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    window.removeEventListener('message', this.onMessage);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Runtime disposed'));
    }
    this.pending.clear();
    try {
      if (this.core === 'js2me' && this.targetOrigin && this.targetOrigin !== location.origin) {
        this.frame.contentWindow?.postMessage(
          { type: 'command', session: this.session, id: ++this.count, method: 'dispose' },
          this.targetOrigin,
        );
      }
    } catch {
      /* ignore */
    }
    this.frame.remove();
    this.urls.forEach((u) => URL.revokeObjectURL(u));
  }
}
