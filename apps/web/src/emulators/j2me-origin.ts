/**
 * J2ME dedicated-origin configuration.
 * Cutover is opt-in via NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN=true.
 * Default remains same-origin production frame until offline gates pass.
 */

export function j2meDedicatedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN === 'true';
}

/** Explicit override, or same-port sibling hostname `j2me.localhost`. */
export function j2meRuntimeOrigin(): string | null {
  if (!j2meDedicatedEnabled()) return null;
  const configured = process.env.NEXT_PUBLIC_J2ME_RUNTIME_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window === 'undefined') return null;
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${window.location.protocol}//j2me.localhost${port}`;
}

export function launcherOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return (process.env.NEXT_PUBLIC_LAUNCHER_ORIGIN || '').replace(/\/$/, '') || 'http://launcher.localhost';
}

export const J2ME_FRAME_PATH = '/runtime/j2me-isolated/j2me-frame-isolated.html';
export const J2ME_INSTALL_PATH = '/j2me-install.html';
export const J2ME_SW_PATH = '/j2me-sw.js';

export const J2ME_RUNTIME_PATHS = [
  J2ME_FRAME_PATH,
  '/runtime/j2me-isolated/j2me-frame-isolated.js',
  '/runtime/j2me-boot.js',
  '/runtime/j2me-rms-idb.js',
  '/runtime/j2me-secure.js',
  '/runtime/j2me-allowlist.json',
  '/runtime/frame.css',
  J2ME_INSTALL_PATH,
  J2ME_SW_PATH,
] as const;
