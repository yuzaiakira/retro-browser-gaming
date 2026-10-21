/**
 * Precache js2me VM assets on the dedicated J2ME origin via install iframe + j2me-sw.
 */

import type { Release } from '@/lib/types';
import {
  J2ME_INSTALL_PATH,
  J2ME_RUNTIME_PATHS,
  j2meDedicatedEnabled,
  j2meRuntimeOrigin,
  launcherOrigin,
} from '@/emulators/j2me-origin';

export async function prepareDedicatedJ2meRuntime(release: Release): Promise<void> {
  if (!j2meDedicatedEnabled() || release.recommended_core.code !== 'js2me') return;
  const origin = j2meRuntimeOrigin();
  if (!origin) throw new Error('J2ME_DEDICATED_ORIGIN_UNCONFIGURED');

  const urls = [
    ...J2ME_RUNTIME_PATHS.map((p) => `${origin}${p}`),
    ...release.recommended_core.licensed_asset_manifest.map((item) => `${origin}/cores/${item.path}`),
  ];

  await new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-100px;top:-100px;opacity:0;border:0';
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
          { channel: 'j2me-install', type: 'PRECACHE_LIST', urls },
          origin,
        );
        return;
      }
      if (event.data.type === 'ready') {
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
