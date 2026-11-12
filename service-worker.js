/**
 * TalentTrack Service Worker (PWA Offline-First)
 * Cache-first strategy for static assets, network-first for dynamic sync.
 */

const CACHE_NAME = 'talenttrack-v1.0.04';
const STATIC_ASSETS = [
  './',
  './index.html',
  './src/main.js',
  './src/styles/app.css',
  './public/version.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [ServiceWorker] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Pre-cache warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [ServiceWorker] Purgando caché anterior:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cachear copias de recursos estáticos válidos
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith('http')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback offline para navegación principal
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
