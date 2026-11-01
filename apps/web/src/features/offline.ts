import { db } from '@/lib/db';
import { verifyAsset } from '@/lib/storage';
import type { Installation, Release } from '@/lib/types';
import { j2meDedicatedEnabled } from '@/emulators/j2me-origin';
import { prepareDedicatedJ2meRuntime } from '@/features/j2me-runtime-install';

/** Must match `VERSION` in `public/sw.js`. */
export const SHELL = 'retro-shell-v5';

const SHELL_PATHS = [
  '/',
  '/library',
  '/downloads',
  '/settings',
  '/diagnostics',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/runtime/frame.html',
  '/runtime/frame.js',
  '/runtime/frame.css',
  '/runtime/dos-frame.html',
  '/runtime/dos-frame.js',
  '/runtime/hatari-frame.html',
  '/runtime/hatari-frame.js',
  '/runtime/ruffle-frame.html',
  '/runtime/ruffle-boot.js',
  '/runtime/ruffle-frame.js',
  '/runtime/mame-frame.html',
  '/runtime/mame-frame.js',
  '/runtime/j2me-frame.html',
  '/runtime/j2me-boot.js',
  '/runtime/j2me-frame.js',
  '/runtime/j2me-rms-idb.js',
  '/runtime/j2me-secure.js',
  '/runtime/j2me-allowlist.json',
  '/runtime/seekable-fs.js',
  '/runtime/blob-reader.worker.js',
];

export async function registerSW() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers unavailable.');
  await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Service worker did not take control. Reload and retry.')),
        10000,
      );
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}

async function cachePath(cache: Cache, path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`SHELL_RESOURCE_MISSING:${path}`);
  await cache.put(path, response);
}

/** Drop prior shell cache versions without touching OPFS/IndexedDB game bytes or saves. */
export async function purgeStaleShellCaches(keep = SHELL) {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('retro-shell-') && key !== keep)
      .map((key) => caches.delete(key)),
  );
}

async function cacheHtmlShell(cache: Cache, path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('SHELL_INSTALL_FAILED');
  const html = await response.clone().text();
  await cache.put(path, response);
  const parser = new DOMParser().parseFromString(html, 'text/html');
  const urls = new Set(
    [...parser.querySelectorAll('script[src],link[rel="stylesheet"]')]
      .map((el) => el.getAttribute('src') ?? el.getAttribute('href')!)
      .filter((url) => url.startsWith('/_next/static/')),
  );
  for (const url of urls) {
    const asset = await fetch(url);
    if (!asset.ok) throw new Error('SHELL_ASSET_MISSING');
    await cache.put(url, asset);
  }
}

export async function prepareShell(id: string) {
  await registerSW();
  await purgeStaleShellCaches();
  const cache = await caches.open(SHELL);
  for (const path of ['/', '/library', '/downloads', '/settings', '/diagnostics', '/offline', `/play/${id}`]) {
    await cacheHtmlShell(cache, path);
  }
  for (const path of SHELL_PATHS) {
    if (await cache.match(path)) continue;
    await cachePath(cache, path);
  }
}

export async function prepareCore(release: Release) {
  const needsCorePackage =
    release.recommended_core.runtime_type === 'wasm' ||
    release.recommended_core.runtime_type === 'js' ||
    release.recommended_core.code === 'js2me' ||
    release.recommended_core.code === 'jsdos' ||
    release.recommended_core.code === 'ruffle' ||
    release.recommended_core.code === 'mame_rbg_arcade' ||
    release.recommended_core.code === 'hatari';
  if (!needsCorePackage) return;
  const manifest = release.recommended_core.licensed_asset_manifest;
  if (!manifest.length) throw new Error('CORE_PACKAGE_UNAVAILABLE');

  // Dedicated J2ME origin: precache VM on j2me host SW (not launcher shell cache).
  if (release.recommended_core.code === 'js2me' && j2meDedicatedEnabled()) {
    await prepareDedicatedJ2meRuntime(release);
    return;
  }

  const cache = await caches.open(SHELL);
  for (const item of manifest) {
    const path = '/cores/' + item.path;
    const response = await fetch(path);
    if (!response.ok) throw new Error('CORE_RESOURCE_MISSING');
    const blob = await response.clone().blob();
    const { hashFile } = await import('@/lib/storage');
    if (blob.size !== item.byteSize || (await hashFile(blob)) !== item.sha256) {
      throw new Error('CORE_INTEGRITY_FAILED');
    }
    await cache.put(path, response);
  }
}

export async function auditInstallation(installation: Installation) {
  const cache = await caches.open(SHELL);
  if (!navigator.serviceWorker.controller || !(await cache.match(`/play/${installation.id}`))) {
    return false;
  }
  for (const asset of installation.manifest.assets) {
    if (!(await verifyAsset(asset))) return false;
  }
  const core = installation.release.recommended_core;
  if (core.code === 'js2me' && j2meDedicatedEnabled()) {
    // Dedicated-origin assets live in j2me SW cache — probed at install time.
    // Launcher audit still requires shell play route + game OPFS bytes.
    return true;
  }
  for (const resource of core.licensed_asset_manifest) {
    const response = await cache.match('/cores/' + resource.path);
    if (!response) return false;
    const { hashFile } = await import('@/lib/storage');
    if ((await hashFile(await response.blob())) !== resource.sha256) return false;
  }
  const framePath =
    core.code === 'jsdos'
      ? '/runtime/dos-frame.html'
      : core.code === 'hatari'
        ? '/runtime/hatari-frame.html'
        : core.code === 'ruffle'
          ? '/runtime/ruffle-frame.html'
          : core.code === 'mame_rbg_arcade'
            ? '/runtime/mame-frame.html'
            : core.code === 'js2me'
            ? '/runtime/j2me-frame.html'
            : '/runtime/frame.html';
  const runtimePaths =
    core.code === 'js2me'
      ? [
          framePath,
          '/runtime/j2me-boot.js',
          '/runtime/j2me-frame.js',
          '/runtime/j2me-rms-idb.js',
          '/runtime/j2me-secure.js',
          '/runtime/j2me-allowlist.json',
        ]
      : core.code === 'jsdos'
        ? [framePath, '/runtime/dos-frame.js']
        : core.code === 'hatari'
          ? [framePath, '/runtime/hatari-frame.js']
          : core.code === 'ruffle'
            ? [framePath, '/runtime/ruffle-boot.js', '/runtime/ruffle-frame.js']
            : core.code === 'mame_rbg_arcade'
              ? [framePath, '/runtime/mame-frame.js']
              : ['/runtime/seekable-fs.js', '/runtime/blob-reader.worker.js', framePath];
  if (
    core.runtime_type === 'wasm' ||
    core.runtime_type === 'js' ||
    core.code === 'js2me' ||
    core.code === 'ruffle' ||
    core.code === 'mame_rbg_arcade'
  ) {
    for (const path of runtimePaths) {
      if (!(await cache.match(path))) return false;
    }
  }
  return true;
}

export async function install(installation: Installation) {
  await prepareCore(installation.release);
  await prepareShell(installation.id);
  if (!(await auditInstallation(installation))) throw new Error('INSTALL_AUDIT_FAILED');
  await (
    await db()
  ).put('installations', {
    ...installation,
    state: 'ready-offline',
    verifiedAt: Date.now(),
    shellVersion: SHELL,
  });
}

/** Ask a waiting service worker to activate (after gameplay ends). */
export function activateWaitingServiceWorker() {
  navigator.serviceWorker?.controller?.postMessage('ACTIVATE_UPDATE');
  navigator.serviceWorker?.getRegistration()?.then((registration) => {
    registration?.waiting?.postMessage('ACTIVATE_UPDATE');
  });
}
