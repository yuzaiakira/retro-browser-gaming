/**
 * Precache js2me VM assets on the dedicated J2ME origin with SHA-256 integrity.
 */

import type { Release } from '@/lib/types';
import {
  J2ME_INSTALL_PATH,
  j2meDedicatedEnabled,
  j2meRuntimeOrigin,
  launcherOrigin,
} from '@/emulators/j2me-origin';

export type PrecacheEntry = { url: string; sha256: string; byteSize: number; path: string };

type RuntimeManifest = {
  version: string;
  entries: Array<{ path: string; sha256: string; byteSize: number }>;
};

/**
 * Load the integrity manifest from the launcher origin (same public bytes).
 * Cross-origin fetch to the J2ME host is blocked by launcher connect-src CSP;
 * URLs in the returned entries still point at the dedicated J2ME origin for SW precache.
 */
async function loadRuntimeManifest(): Promise<RuntimeManifest> {
  const res = await fetch(`/runtime/j2me-runtime-manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('J2ME_RUNTIME_MANIFEST_MISSING');
  const data = (await res.json()) as RuntimeManifest;
  if (!data?.version || !Array.isArray(data.entries) || !data.entries.length) {
    throw new Error('J2ME_RUNTIME_MANIFEST_INVALID');
  }
  return data;
}

export async function buildJ2mePrecacheEntries(
  origin: string,
  release: Release,
): Promise<{ version: string; entries: PrecacheEntry[] }> {
  const manifest = await loadRuntimeManifest();
  const entries: PrecacheEntry[] = [];

  for (const item of manifest.entries) {
    if (item.path === '/j2me-sw.js') continue; // browser-managed SW script
    if (!item.sha256 || !Number.isInteger(item.byteSize) || item.byteSize <= 0) {
      throw new Error(`J2ME_MANIFEST_ENTRY_INVALID:${item.path}`);
    }
    entries.push({
      path: item.path,
      url: `${origin}${item.path}`,
      sha256: item.sha256.toLowerCase(),
      byteSize: item.byteSize,
    });
  }

  for (const item of release.recommended_core.licensed_asset_manifest) {
    if (!item.path.startsWith('js2me/')) {
      throw new Error(`J2ME_CORE_PATH_REJECTED:${item.path}`);
    }
    entries.push({
      path: `/cores/${item.path}`,
      url: `${origin}/cores/${item.path}`,
      sha256: String(item.sha256).toLowerCase(),
      byteSize: item.byteSize,
    });
  }

  if (!entries.length) throw new Error('J2ME_PRECACHE_EMPTY');
  return { version: manifest.version, entries };
}

export async function prepareDedicatedJ2meRuntime(release: Release): Promise<void> {
  if (!j2meDedicatedEnabled() || release.recommended_core.code !== 'js2me') return;
  const origin = j2meRuntimeOrigin();
  if (!origin) throw new Error('J2ME_DEDICATED_ORIGIN_UNCONFIGURED');

  const { version, entries } = await buildJ2mePrecacheEntries(origin, release);

  await new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;width:1px;height:1px;left:-100px;top:-100px;opacity:0;border:0';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.title = 'J2ME runtime install';
    const parent = launcherOrigin();
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('J2ME_RUNTIME_INSTALL_TIMEOUT'));
    }, 180000);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.channel !== 'j2me-install') return;
      if (event.data.type === 'boot') {
        iframe.contentWindow?.postMessage(
          { channel: 'j2me-install', type: 'PRECACHE_LIST', entries, version },
          origin,
        );
        return;
      }
      if (event.data.type === 'ready') {
        iframe.contentWindow?.postMessage(
          { channel: 'j2me-install', type: 'VERIFY', entries },
          origin,
        );
        return;
      }
      if (event.data.type === 'verified') {
        cleanup();
        resolve();
        return;
      }
      if (event.data.type === 'error') {
        cleanup();
        reject(new Error(event.data.error || 'J2ME_RUNTIME_INSTALL_FAILED'));
      }
    };

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
    }

    window.addEventListener('message', onMessage);
    iframe.src = `${origin}${J2ME_INSTALL_PATH}?parentOrigin=${encodeURIComponent(parent)}`;
    document.body.appendChild(iframe);
  });
}

export async function probeDedicatedJ2meCache(): Promise<{
  controlled: boolean;
  count: number;
  origin: string;
  ready?: boolean;
  version?: string | null;
} | null> {
  if (!j2meDedicatedEnabled()) return null;
  const origin = j2meRuntimeOrigin();
  if (!origin) return null;
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-100px;opacity:0;border:0';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    const parent = launcherOrigin();
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('J2ME_CACHE_PROBE_TIMEOUT'));
    }, 30000);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.data?.channel !== 'j2me-install') return;
      if (event.data.type === 'boot') {
        iframe.contentWindow?.postMessage({ channel: 'j2me-install', type: 'STATUS' }, origin);
      }
      if (event.data.type === 'status') {
        cleanup();
        resolve({
          controlled: !!event.data.controlled,
          count: event.data.count || 0,
          origin: event.data.origin || origin,
          ready: !!event.data.ready,
          version: event.data.version || null,
        });
      }
      if (event.data.type === 'error') {
        cleanup();
        reject(new Error(event.data.error));
      }
    };
    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
    }
    window.addEventListener('message', onMessage);
    iframe.src = `${origin}${J2ME_INSTALL_PATH}?parentOrigin=${encodeURIComponent(parent)}`;
    document.body.appendChild(iframe);
  });
}
