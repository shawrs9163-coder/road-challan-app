const CACHE_NAME = 'road-challan-v5';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json'
];

// Install - cache assets and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - delete old caches, take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network-first for HTML (always get latest), cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // Network-first: try to get fresh HTML, fall back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for other assets (icons, manifest, fonts)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// Notify clients when a new SW has taken over so they can prompt a reload
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
