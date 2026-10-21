/* Dedicated-origin J2ME runtime service worker.
 *
 * Cache promotion is NOT a single CacheStorage transaction. Safety comes from:
 * - Immutable unique generation names (never reuse the active cache name).
 * - Write ready marker into the new generation before flipping the active pointer.
 * - Never delete the last known-good generation until the pointer has moved.
 * - Staging leftovers are discarded on failure without touching the active pointer.
 *
 * ACTIVATE_UPDATE is accepted only from /j2me-install.html clients.
 */
const META = 'j2me-runtime-meta';
const ACTIVE_KEY = 'active';
const READY_MARKER = '__j2me_runtime_ready__';
const KEEP_PREVIOUS_GENERATIONS = 1;

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

function faultInjectionAllowed() {
  const host = self.location.hostname;
  return host === 'localhost' || host.endsWith('.localhost');
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

function newGenerationName(version) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `j2me-runtime-gen-${version}-${id}`;
}

function isRuntimeGeneration(key) {
  return key.startsWith('j2me-runtime-gen-') || /^j2me-runtime-(?!meta$|staging-)/.test(key);
}

function isStaging(key) {
  return key.includes('-staging-') || key.startsWith('j2me-runtime-staging-');
}

async function authorizeInstallClient(source) {
  if (!source || typeof source !== 'object') return { ok: false, error: 'NO_CLIENT' };
  // ServiceWorker MessageEvent.source may be a Client or MessagePort.
  if (typeof source.url !== 'string') return { ok: false, error: 'NOT_A_WINDOW_CLIENT' };
  let url;
  try {
    url = new URL(source.url);
  } catch {
    return { ok: false, error: 'BAD_CLIENT_URL' };
  }
  if (url.origin !== self.location.origin) return { ok: false, error: 'CROSS_ORIGIN_CLIENT' };
  if (url.pathname !== '/j2me-install.html') {
    return { ok: false, error: 'CLIENT_NOT_INSTALL_SURFACE', pathname: url.pathname };
  }
  return { ok: true, url: url.href };
}

self.addEventListener('install', () => {
  // Stay waiting until an authorized install surface sends ACTIVATE_UPDATE.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Do not delete runtime generations here — promotion owns retention.
      // Only scrub abandoned staging caches.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => isStaging(k)).map((k) => caches.delete(k)));
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'ACTIVATE_UPDATE' || data?.type === 'ACTIVATE_UPDATE') {
    event.waitUntil(
      (async () => {
        const auth = await authorizeInstallClient(event.source);
        if (!auth.ok) {
          event.source?.postMessage({
            type: 'ACTIVATE_DENIED',
            error: auth.error,
            pathname: auth.pathname || null,
          });
          return;
        }
        await self.skipWaiting();
        event.source?.postMessage({ type: 'ACTIVATE_ACCEPTED' });
      })(),
    );
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
        const all = await caches.keys();
        event.source?.postMessage({
          type: 'CACHE_STATUS_RESULT',
          version: active,
          cacheName: active,
          count: keys.filter((r) => !String(r.url).includes(READY_MARKER)).length,
          urls: keys.map((r) => r.url),
          ready: !!(await cache?.match(READY_MARKER)),
          generations: all.filter((k) => isRuntimeGeneration(k) && !isStaging(k)),
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
  const fault =
    faultInjectionAllowed() && typeof data.fault === 'string' ? data.fault : null;

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

  const previous = await activeCacheName();
  const stagingName = `j2me-runtime-staging-${version}-${Date.now()}`;
  // Unique generation — never equal to previous active name.
  const generationName = newGenerationName(version);
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
        version: generationName,
        previous,
        results,
      });
      return;
    }

    // Copy staging → new immutable generation (does not touch previous active).
    const generation = await caches.open(generationName);
    const staged = await staging.keys();
    let copied = 0;
    for (const req of staged) {
      if (fault === 'quota-during-copy' && copied >= 1) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      const res = await staging.match(req);
      if (res) await generation.put(req, res);
      copied += 1;
    }

    if (fault === 'crash-before-ready') {
      throw new Error('FAULT_CRASH_BEFORE_READY');
    }

    await generation.put(
      READY_MARKER,
      new Response(
        JSON.stringify({
          version: generationName,
          manifestVersion: version,
          count: results.length,
          at: Date.now(),
          previous,
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    );

    // Verify generation completeness before pointer switch.
    for (const entry of entries) {
      const absolute = new URL(String(entry.url), self.location.origin).href;
      if (!(await generation.match(absolute))) {
        throw new Error('GENERATION_INCOMPLETE');
      }
    }

    if (fault === 'crash-before-meta') {
      throw new Error('FAULT_CRASH_BEFORE_META');
    }

    // Pointer switch — only after ready marker + verification.
    await metaPut(ACTIVE_KEY, {
      cacheName: generationName,
      manifestVersion: version,
      at: Date.now(),
      count: results.length,
      previous,
    });

    await caches.delete(stagingName);

    // Retain previous known-good briefly, then drop older generations.
    await pruneOldGenerations(generationName, previous);

    event.source?.postMessage({
      type: 'PRECACHE_DONE',
      ok: true,
      version: generationName,
      previous,
      results,
    });
  } catch (error) {
    await caches.delete(stagingName);
    // Incomplete generation must not become active; delete the orphan generation
    // only if the active pointer still points at previous (safe).
    const stillActive = await activeCacheName();
    if (stillActive !== generationName) {
      await caches.delete(generationName);
    }
    event.source?.postMessage({
      type: 'PRECACHE_DONE',
      ok: false,
      error: String(error?.name === 'QuotaExceededError' ? 'QuotaExceededError' : error?.message || error),
      previous: stillActive,
      attempted: generationName,
      results,
    });
  }
}

async function pruneOldGenerations(activeName, previousName) {
  const keys = await caches.keys();
  const keep = new Set([activeName]);
  if (previousName && KEEP_PREVIOUS_GENERATIONS > 0) keep.add(previousName);
  await Promise.all(
    keys
      .filter((k) => {
        if (k === META) return false;
        if (isStaging(k)) return true;
        if (!isRuntimeGeneration(k) && !k.startsWith('j2me-runtime-')) return false;
        if (keep.has(k)) return false;
        // Drop legacy non-gen names and surplus generations.
        return true;
      })
      .map((k) => caches.delete(k)),
  );
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
