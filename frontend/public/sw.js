/// <reference lib="webworker" />
/**
 * Service worker for the aviation weather viewer.
 *
 * Plain ES2020: public/ is served verbatim, so nothing here is transpiled or
 * bundled and it cannot import anything.
 *
 * Scope of the offline story: the app shell plus whatever scene the user already
 * looked at. Nothing is precached speculatively from the 6.5 MB dataset.
 */

const NS = 'awv';
// Bump when the logic below or the tier-A precache list changes.
const SW_REV = '2026-08-23a';
// Bump when public/map/** changes.
const MAP_REV = '1';
// Scenario code + weather manifest schema version.
const DATA_REV = 'demo-colombia-001.s3';

const CACHE_SHELL = NS + '-shell-' + SW_REV;
const CACHE_MAP = NS + '-map-' + MAP_REV;
// Deliberately unversioned: /_next/static URLs are content-hashed, so a stale
// entry is never wrong, and wiping it would hand ChunkLoadError to any tab still
// running the previous build.
const CACHE_NEXT = NS + '-next-static';
const CACHE_SCENE = NS + '-scene-' + DATA_REV;

const KEEP = [CACHE_SHELL, CACHE_MAP, CACHE_NEXT, CACHE_SCENE];

const OFFLINE_URL = '/offline.html';
const SCENE_PREFIX = '/media/demo-weather/';
const NAVIGATION_TIMEOUT_MS = 3000;
const NEXT_MAX_ENTRIES = 200;
const SCENE_MAX_ENTRIES = 240;

/** Must succeed for the worker to be worth installing. */
const PRECACHE_CRITICAL = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/favicon.svg',
];

/** Warmed after activation; failures are tolerated. ~1 MB of frozen basemap. */
const PRECACHE_BASEMAP = [
  '/map/style.json',
  '/map/maplibre-gl-worker.mjs',
  '/map/maplibre-gl-shared.mjs',
  '/map/data/regional-coastline.geojson',
  '/map/data/regional-countries.geojson',
  '/map/data/colombia-departments.geojson',
  '/map/data/map-labels.geojson',
  '/map/fonts/Noto%20Sans%20Regular/0-255.pbf',
];

/**
 * Speaks the error contract weatherService.responseError already parses, so an
 * offline miss surfaces through the existing status UI with no new components.
 */
function offlineResponse() {
  return new Response(
    JSON.stringify({
      error: {
        code: 'offline',
        message:
          'Sin conexión: este cuadro no está disponible sin red. Los datos ya consultados siguen visibles.',
      },
    }),
    {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
}

function isImmutable(response) {
  return (response.headers.get('cache-control') || '').indexOf('immutable') !== -1;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // cache.keys() is insertion-ordered, so this is FIFO rather than true LRU.
  // Faking recency would cost a cache write per request for no real benefit.
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

/** A failed cache write must never fail the request it came from. */
async function safePut(cacheName, request, response, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    if (maxEntries) await trimCache(cacheName, maxEntries);
  } catch (error) {
    if (error && error.name === 'QuotaExceededError') {
      try {
        const scene = await caches.open(CACHE_SCENE);
        const keys = await scene.keys();
        await Promise.all(
          keys.slice(0, Math.ceil(keys.length / 4)).map((key) => scene.delete(key)),
        );
      } catch {
        // Out of options; keep serving from the network.
      }
    }
  }
}

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Pure routing decision, kept separate so the table can be unit tested without
 * a browser.
 */
function routeFor(request, url) {
  if (request.method !== 'GET') return 'bypass';
  if (url.origin !== self.location.origin) return 'bypass';
  if (request.headers && request.headers.has && request.headers.has('RSC')) return 'bypass';
  if (request.mode === 'navigate') return 'navigation';

  const path = url.pathname;
  if (path.indexOf('/_next/static/') === 0) return 'next-static';
  if (path.indexOf('/_next/') === 0) return 'bypass';
  if (path.indexOf('/map/') === 0) return 'map';
  if (path.indexOf(SCENE_PREFIX) === 0) return 'scene';
  if (path.indexOf('/api/v1/') === 0) return 'api';
  if (path.indexOf('/api/') === 0) return 'bypass';
  if (path.indexOf('/media/') === 0) return 'bypass';
  if (path === '/manifest.webmanifest' || path.indexOf('/icons/') === 0) return 'shell';
  return 'bypass';
}

async function handleNavigation(event) {
  const cache = await caches.open(CACHE_SHELL);
  const cachedDocument = () => cache.match('/', { ignoreVary: true, ignoreSearch: true });

  // Offline is a reliable negative signal; waiting 3 s for it is not "opens instantly".
  if (self.navigator && self.navigator.onLine === false) {
    const cached = await cachedDocument();
    if (cached) return cached;
  }

  try {
    const response = await fetchWithTimeout(event.request, NAVIGATION_TIMEOUT_MS);
    if (response && response.ok) {
      event.waitUntil(safePut(CACHE_SHELL, '/', response.clone()));
    }
    return response;
  } catch {
    const cached = await cachedDocument();
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL, { ignoreVary: true });
    if (offline) return offline;
    return offlineResponse();
  }
}

async function cacheFirst(event, cacheName, options) {
  const settings = options || {};
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(event.request);
  const cacheable = response && response.ok && (!settings.immutableOnly || isImmutable(response));
  if (cacheable) {
    event.waitUntil(safePut(cacheName, event.request, response.clone(), settings.maxEntries));
  }
  return response;
}

async function staleWhileRevalidate(event, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request, { ignoreVary: true });

  const network = fetch(event.request)
    .then((response) => {
      if (response && response.ok) {
        event.waitUntil(safePut(cacheName, event.request, response.clone(), maxEntries));
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }

  return (await network) || offlineResponse();
}

async function handle(route, event) {
  try {
    switch (route) {
      case 'navigation':
        return await handleNavigation(event);
      case 'next-static':
        return await cacheFirst(event, CACHE_NEXT, {
          immutableOnly: true,
          maxEntries: NEXT_MAX_ENTRIES,
        });
      case 'map':
        return await cacheFirst(event, CACHE_MAP, {});
      case 'scene':
        return await cacheFirst(event, CACHE_SCENE, { maxEntries: SCENE_MAX_ENTRIES });
      case 'api':
        return await staleWhileRevalidate(event, CACHE_SCENE, SCENE_MAX_ENTRIES);
      case 'shell':
        return await cacheFirst(event, CACHE_SHELL, {});
      default:
        return await fetch(event.request);
    }
  } catch {
    // respondWith must never reject: a rejection becomes a hard network error,
    // which is strictly worse than having no service worker at all.
    return offlineResponse();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      // Individually, not addAll: one missing icon must not abort the install.
      await Promise.allSettled(PRECACHE_CRITICAL.map((url) => cache.add(url)));
      const offline = await cache.match(OFFLINE_URL, { ignoreVary: true });
      if (!offline) throw new Error('offline document missing from precache');
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.indexOf(NS + '-') === 0 && KEEP.indexOf(name) === -1)
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();

      // Warm the document itself. The very first navigation happens before this
      // worker controls the page, so without this the app would need a second
      // online visit before it could open offline.
      const shell = await caches.open(CACHE_SHELL);
      await Promise.allSettled([shell.add('/')]);

      // Non-blocking warm of the basemap so the map renders offline.
      const cache = await caches.open(CACHE_MAP);
      await Promise.allSettled(PRECACHE_BASEMAP.map((url) => cache.add(url)));
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const route = routeFor(event.request, url);
  if (route === 'bypass') return;
  event.respondWith(handle(route, event));
});

self.addEventListener('message', (event) => {
  // Activation is user-driven: a silent takeover mid-session can hand a running
  // tab a ChunkLoadError, and a surprise reload mid-demo is unacceptable.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Exposed for the routing table unit test; harmless in production.
self.__swRouteFor = routeFor;
