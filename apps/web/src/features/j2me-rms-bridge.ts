/**
 * Cross-origin RMS export/import via the dedicated-origin install bridge.
 * Used for rollback: pull newer dedicated saves into the launcher origin.
 */

import {
  J2ME_INSTALL_PATH,
  j2meDedicatedEnabled,
  j2meRuntimeOrigin,
  launcherOrigin,
} from '@/emulators/j2me-origin';
import {
  mergeSuitesIntoLauncher,
  type RmsSnapshot,
  type SuiteMigration,
} from '@/features/j2me-rms-migrate';

function openBridgeIframe(origin: string, parent: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;width:1px;height:1px;left:-100px;top:-100px;opacity:0;border:0';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.title = 'J2ME RMS bridge';
  iframe.src = `${origin}${J2ME_INSTALL_PATH}?parentOrigin=${encodeURIComponent(parent)}`;
  return iframe;
}

/** Pull all dedicated-origin RMS suites (for rollback before cutover disable). */
export async function exportDedicatedRmsSuites(): Promise<SuiteMigration[]> {
  if (!j2meDedicatedEnabled()) throw new Error('J2ME_DEDICATED_DISABLED');
  const origin = j2meRuntimeOrigin();
  if (!origin) throw new Error('J2ME_DEDICATED_ORIGIN_UNCONFIGURED');
  const parent = launcherOrigin();

  return new Promise((resolve, reject) => {
    const iframe = openBridgeIframe(origin, parent);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('J2ME_RMS_EXPORT_TIMEOUT'));
    }, 60000);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.channel !== 'j2me-install') return;
      if (event.data.type === 'boot') {
        iframe.contentWindow?.postMessage(
          { channel: 'j2me-install', type: 'EXPORT_RMS' },
          origin,
        );
        return;
      }
      if (event.data.type === 'rms-export') {
        const suites = (Array.isArray(event.data.suites) ? event.data.suites : []).map(
          (s: { midletId: string; snapshot: RmsSnapshot }) => ({
            midletId: s.midletId,
            snapshot: s.snapshot,
            byteSize: 0,
          }),
        ) as SuiteMigration[];
        cleanup();
        resolve(suites);
        return;
      }
      if (event.data.type === 'error') {
        cleanup();
        reject(new Error(event.data.error || 'J2ME_RMS_EXPORT_FAILED'));
      }
    };

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
    }

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

/**
 * Rollback safety: merge dedicated-origin saves into launcher IDB.
 * Newer dedicated progress wins; never overwrite newer launcher data with stale export.
 */
export async function rollbackDedicatedRmsToLauncher() {
  const suites = await exportDedicatedRmsSuites();
  if (!suites.length) {
    return { suites: 0, results: [] as Array<{ midletId: string; decision: string }> };
  }
  const results = await mergeSuitesIntoLauncher(suites, { originLabel: 'dedicated-rollback' });
  return { suites: suites.length, results };
}
