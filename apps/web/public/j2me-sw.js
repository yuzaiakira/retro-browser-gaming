/* Dedicated-origin J2ME runtime service worker.
 * Scope: j2me.localhost only. Caches VM + frame assets — never launcher shell or game JARs.
 * Version bumps prune prior j2me-runtime-* CacheStorage entries only.
 */
const VERSION = 'j2me-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('j2me-runtime-') && key !== VERSION)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'PRECACHE' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VERSION);
        const results = [];
        for (const url of data.urls) {
          try {
            const absolute = new URL(url, self.location.origin).href;
            if (!absolute.startsWith(self.location.origin)) {
              results.push({ url, ok: false, error: 'CROSS_ORIGIN' });
              continue;
            }
            const response = await fetch(absolute, { cache: 'no-store' });
            if (!response.ok) {
              results.push({ url, ok: false, error: `HTTP_${response.status}` });
              continue;
            }
            await cache.put(absolute, response.clone());
            results.push({ url, ok: true, status: response.status });
          } catch (error) {
            results.push({ url, ok: false, error: String(error?.message || error) });
          }
        }
        event.source?.postMessage({ type: 'PRECACHE_DONE', version: VERSION, results });
      })(),
    );
  }
  if (data.type === 'CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VERSION);
        const keys = await cache.keys();
        event.source?.postMessage({
          type: 'CACHE_STATUS_RESULT',
          version: VERSION,
          count: keys.length,
          urls: keys.map((r) => r.url),
        });
      })(),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const allowed =
    url.pathname.startsWith('/runtime/') ||
    url.pathname.startsWith('/cores/js2me/') ||
    url.pathname === '/j2me-sw.js' ||
    url.pathname === '/j2me-install.html';

  if (!allowed) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response.ok && response.type !== 'opaque') await cache.put(req, response.clone());
        return response;
      } catch {
        return new Response('J2ME runtime offline resource missing', {
          status: 503,
          statusText: 'Offline',
        });
      }
    })(),
  );
});
