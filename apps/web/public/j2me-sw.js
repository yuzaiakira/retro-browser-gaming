/* Dedicated-origin J2ME runtime service worker (atomic, integrity-checked).
 * - Precaches into a staging cache; promotes only after every entry verifies.
 * - Never deletes a working active cache before the replacement is ready.
 * - Does not skipWaiting on install; activate only on ACTIVATE_UPDATE.
 * - Rejects precache URLs outside the approved path allowlist.
 */
const META = 'j2me-runtime-meta';
const ACTIVE_KEY = 'active';
const READY_MARKER = '__j2me_runtime_ready__';

const PATH_ALLOW = [
  /^\/runtime\/j2me/,
  /^\/runtime\/frame\.css$/,
  /^\/runtime\/j2me-runtime-manifest\.json$/,
  /^\/cores\/js2me\//,
  /^\/j2me-install\.html$/,
];

function pathAllowed(pathname) {
  return PATH_ALLOW.some((re) => re.test(pathname));
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function metaGet(key) {
  const cache = await caches.open(META);
  const res = await cache.match(key);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function metaPut(key, value) {
  const cache = await caches.open(META);
  await cache.put(
    key,
    new Response(JSON.stringify(value), {
      headers: { 'content-type': 'application/json' },
    }),
  );
}

async function activeCacheName() {
  const meta = await metaGet(ACTIVE_KEY);
  return meta?.cacheName || null;
}

self.addEventListener('install', () => {
  // Stay waiting until install page sends ACTIVATE_UPDATE so active gameplay is undisturbed.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const active = await activeCacheName();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => {
            if (key === META) return false;
            if (!key.startsWith('j2me-runtime-')) return false;
            if (active && key === active) return false;
            if (key.includes('-staging-')) return true;
            // Keep the active cache; drop other completed/orphan runtime caches.
            return active ? key !== active : false;
          })
          .map((key) => caches.delete(key)),
      );
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'ACTIVATE_UPDATE' || data?.type === 'ACTIVATE_UPDATE') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (!data || typeof data !== 'object') return;

  if (data.type === 'PRECACHE') {
    event.waitUntil(runPrecache(event, data));
    return;
  }
  if (data.type === 'CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        const active = await activeCacheName();
        const cache = active ? await caches.open(active) : null;
        const keys = cache ? await cache.keys() : [];
        event.source?.postMessage({
          type: 'CACHE_STATUS_RESULT',
          version: active,
          count: keys.filter((r) => !String(r.url).includes(READY_MARKER)).length,
          urls: keys.map((r) => r.url),
          ready: !!(await cache?.match(READY_MARKER)),
        });
      })(),
    );
  }
  if (data.type === 'VERIFY_ACTIVE') {
    event.waitUntil(
      (async () => {
        const result = await verifyActiveCache(data.entries || []);
        event.source?.postMessage({ type: 'VERIFY_ACTIVE_RESULT', ...result });
      })(),
    );
  }
});

async function runPrecache(event, data) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const version = String(data.version || 'j2me-runtime').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!entries.length) {
    event.source?.postMessage({
      type: 'PRECACHE_DONE',
      ok: false,
      error: 'J2ME_PRECACHE_EMPTY',
    });
    return;
  }
  if (entries.length > 600) {
    event.source?.postMessage({
      type: 'PRECACHE_DONE',
      ok: false,
      error: 'J2ME_PRECACHE_TOO_MANY',
    });
    return;
  }

  const stagingName = `j2me-runtime-staging-${version}-${Date.now()}`;
  const finalName = `j2me-runtime-${version}`;
  const staging = await caches.open(stagingName);
  const results = [];

  try {
    for (const entry of entries) {
      const url = String(entry?.url || '');
      const expectSha = String(entry?.sha256 || '').toLowerCase();
      const expectSize = Number(entry?.byteSize);
      try {
        const absolute = new URL(url, self.location.origin);
        if (absolute.origin !== self.location.origin) {
          results.push({ url, ok: false, error: 'CROSS_ORIGIN' });
          continue;
        }
        if (!pathAllowed(absolute.pathname)) {
          results.push({ url, ok: false, error: 'PATH_NOT_ALLOWED' });
          continue;
        }
        if (!/^[0-9a-f]{64}$/.test(expectSha)) {
          results.push({ url, ok: false, error: 'SHA_REQUIRED' });
          continue;
        }
        if (!Number.isInteger(expectSize) || expectSize <= 0) {
          results.push({ url, ok: false, error: 'SIZE_REQUIRED' });
          continue;
        }
        const response = await fetch(absolute.href, { cache: 'no-store' });
        if (!response.ok) {
          results.push({ url, ok: false, error: `HTTP_${response.status}` });
          continue;
        }
        const buffer = await response.clone().arrayBuffer();
        if (buffer.byteLength !== expectSize) {
          results.push({
            url,
            ok: false,
            error: 'SIZE_MISMATCH',
            got: buffer.byteLength,
            expect: expectSize,
          });
          continue;
        }
        const digest = await sha256Hex(buffer);
        if (digest !== expectSha) {
          results.push({ url, ok: false, error: 'SHA_MISMATCH' });
          continue;
        }
        await staging.put(
          absolute.href,
          new Response(buffer, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          }),
        );
        results.push({ url, ok: true, sha256: digest, byteSize: expectSize });
      } catch (error) {
        results.push({ url, ok: false, error: String(error?.message || error) });
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      await caches.delete(stagingName);
      event.source?.postMessage({
        type: 'PRECACHE_DONE',
        ok: false,
        error: 'J2ME_PRECACHE_FAILED',
        version: finalName,
        results,
      });
      return;
    }

    // Promote staging → final without deleting the previous active first.
    await caches.delete(finalName);
    const finalCache = await caches.open(finalName);
    const staged = await staging.keys();
    for (const req of staged) {
      const res = await staging.match(req);
      if (res) await finalCache.put(req, res);
    }
    await finalCache.put(
      READY_MARKER,
      new Response(
        JSON.stringify({
          version: finalName,
          count: results.length,
          at: Date.now(),
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    );
    await caches.delete(stagingName);

    const previous = await activeCacheName();
    await metaPut(ACTIVE_KEY, { cacheName: finalName, at: Date.now(), count: results.length });

    // Only now drop the previous active (and leftover staging).
    if (previous && previous !== finalName) {
      await caches.delete(previous);
    }
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('j2me-runtime-staging-')).map((k) => caches.delete(k)),
    );

    event.source?.postMessage({
      type: 'PRECACHE_DONE',
      ok: true,
      version: finalName,
      results,
    });
  } catch (error) {
    await caches.delete(stagingName);
    event.source?.postMessage({
      type: 'PRECACHE_DONE',
      ok: false,
      error: String(error?.message || error),
      results,
    });
  }
}

async function verifyActiveCache(entries) {
  const active = await activeCacheName();
  if (!active) return { ok: false, error: 'NO_ACTIVE_CACHE' };
  const cache = await caches.open(active);
  if (!(await cache.match(READY_MARKER))) return { ok: false, error: 'NOT_READY', version: active };
  const missing = [];
  for (const entry of entries) {
    const absolute = new URL(String(entry.url), self.location.origin).href;
    const res = await cache.match(absolute);
    if (!res) {
      missing.push(entry.url);
      continue;
    }
    if (entry.sha256) {
      const buf = await res.clone().arrayBuffer();
      const digest = await sha256Hex(buf);
      if (digest !== String(entry.sha256).toLowerCase()) {
        missing.push(entry.url);
      }
    }
  }
  return { ok: missing.length === 0, version: active, missing };
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!pathAllowed(url.pathname) && !url.pathname.startsWith('/runtime/')) return;
  // Only serve allowlisted runtime paths from cache.
  if (!pathAllowed(url.pathname)) return;

  event.respondWith(
    (async () => {
      const active = await activeCacheName();
      if (active) {
        const cache = await caches.open(active);
        const cached = await cache.match(req);
        if (cached) return cached;
      }
      try {
        return await fetch(req);
      } catch {
        return new Response('J2ME runtime offline resource missing', {
          status: 503,
          statusText: 'Offline',
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
    })(),
  );
});
