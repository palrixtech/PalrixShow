/**
 * PalrixShow Service Worker — Network-First Strategy
 * Always fetches fresh content from the network on every request.
 * Falls back to cache only if the network is completely offline.
 */

const CACHE_NAME = 'palrix-cache-v1';

// On install — skip waiting so the new SW activates immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// On activate — claim all open tabs immediately and clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete all old caches
      caches.keys().then(keys =>
        Promise.all(keys.map(key => caches.delete(key)))
      )
    ])
  );
});

// On every fetch request — try network first, fall back to cache if offline
self.addEventListener('fetch', event => {
  // Only handle GET requests for our own origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        // Got a fresh response — clone it and store in cache for offline fallback
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline mode)
        return caches.match(event.request);
      })
  );
});
