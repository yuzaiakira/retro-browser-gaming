/* Retro Browser Gaming shell service worker.
 * Caches shell/core runtime only. Game ROM bytes stay in OPFS; saves stay in IndexedDB.
 * Version bumps must never delete OPFS/IDB. Old shell CacheStorage entries are pruned on activate.
 */
const VERSION = 'retro-shell-v5';

self.addEventListener('install', () => {
  // Stay in waiting until the page sends ACTIVATE_UPDATE so active gameplay is not disrupted.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('retro-shell-') && key !== VERSION)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'ACTIVATE_UPDATE') {
    self.skipWaiting();
  }
  if (event.data === 'PURGE_STALE_SHELL') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('retro-shell-') && key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      ),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (
    req.method !== 'GET' ||
    url.origin !== location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/dev-assets/')
  ) {
    return;
  }

  const cacheable =
    req.mode === 'navigate' ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/runtime/') ||
    url.pathname.startsWith('/cores/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest';

  if (!cacheable) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response.ok && response.type !== 'opaque') await cache.put(req, response.clone());
        return response;
      } catch {
        if (req.mode === 'navigate') {
          const fallback = await cache.match('/offline');
          if (fallback) return fallback;
        }
        return new Response('Offline resource missing', { status: 503, statusText: 'Offline' });
      }
    })(),
  );
});
