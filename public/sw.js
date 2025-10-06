const CACHE_NAME = 'amharic-code-craft-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch with network-first strategy for better reliability
self.addEventListener('fetch', (event) => {
  // Skip chrome-extension and non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Use network-first strategy to avoid serving stale cached assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful GET responses
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch((error) => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline response as last resort
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});