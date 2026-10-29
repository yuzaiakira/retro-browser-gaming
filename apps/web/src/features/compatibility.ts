import type { Release } from '@/lib/types';

export interface Device {
  secure: boolean;
  wasm: boolean;
  threads: boolean;
  webgl2: boolean;
  /** Origin Private File System via `navigator.storage.getDirectory`. */
  opfs: boolean;
  /** Web Locks API. */
  locks: boolean;
  /** `navigator.storage` exists (estimate/persist may still fail). */
  storageManager: boolean;
  gamepad: boolean;
  touch: boolean;
  quota?: number;
  usage?: number;
  userAgent: string;
}

export async function inspectDevice(): Promise<Device> {
  let estimate: StorageEstimate = {};
  const storageManager = typeof navigator !== 'undefined' && !!navigator.storage;
  try {
    if (storageManager && typeof navigator.storage.estimate === 'function') {
      estimate = await navigator.storage.estimate();
    }
  } catch {
    /* estimate is optional; missing storage manager is reported separately */
  }
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return {
    secure: isSecureContext,
    wasm: typeof WebAssembly !== 'undefined',
    threads: crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined',
    webgl2: !!gl,
    opfs: !!navigator.storage?.getDirectory,
    locks: !!navigator.locks,
    storageManager,
    gamepad: !!navigator.getGamepads,
    touch: navigator.maxTouchPoints > 0,
    quota: estimate.quota,
    usage: estimate.usage,
    userAgent: navigator.userAgent,
  };
}

export function probe(device: Device, release: Release, bytes = 0) {
  const reasons: string[] = [];
  if (!device.secure) reasons.push('A secure context (HTTPS or localhost) is required.');
  if (!device.opfs) {
    reasons.push(
      'This browser lacks Origin Private File System (OPFS). Installs need `navigator.storage.getDirectory`.',
    );
  }
  if (!device.locks) {
    reasons.push('This browser lacks the Web Locks API required for safe downloads.');
  }
  // Every newly onboarded core must be gated by its declared requirements,
  // not by a hard-coded console name. Keep the legacy PSP safety rule until
  // every published PSP release carries an explicit "threads" requirement.
  const core = release.recommended_core;
  const required = new Set(core.min_capabilities);
  if ((core.runtime_type === 'wasm' || required.has('wasm')) && !device.wasm) {
    reasons.push('WebAssembly is unavailable.');
  }
  if ((required.has('threads') || core.code === 'ppsspp') && !device.threads) {
    reasons.push(
      core.code === 'ppsspp'
        ? 'PSP needs SharedArrayBuffer and cross-origin isolation.'
        : 'This emulator needs SharedArrayBuffer and cross-origin isolation.',
    );
  }
  if (required.has('webgl2') && !device.webgl2) {
    reasons.push('WebGL2 is required.');
  }
  if (
    release.recommended_core.runtime_type === 'wasm' &&
    bytes > 256 * 1024 * 1024 &&
    !device.threads
  ) {
    reasons.push(
      'Large discs need cross-origin isolation and SharedArrayBuffer for seekable local access.',
    );
  }
  if (reasons.length) return { status: 'unsupported' as const, reasons };
  if (
    device.quota !== undefined &&
    device.quota - (device.usage ?? 0) < bytes + 32 * 1024 * 1024
  ) {
    return {
      status: 'unsupported' as const,
      reasons: ['Not enough available storage. Delete a game or free browser storage.'],
    };
  }
  return {
    status: 'limited' as const,
    reasons: [
      device.quota === undefined
        ? 'Storage quota is unknown.'
        : 'Browser capabilities are present. Actual game compatibility depends on this device and core version.',
    ],
  };
}

export async function benchmark(): Promise<{ milliseconds: number; iterations: number }> {
  const worker = new Worker(new URL('../workers/benchmark.worker.ts', import.meta.url));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Benchmark timed out'));
    }, 5000);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Benchmark failed'));
    };
    worker.postMessage('run');
  });
}
