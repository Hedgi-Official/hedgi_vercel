// Simple service worker to handle cache invalidation
const CACHE_NAME = 'hedgi-v' + Date.now();
const urlsToCache = [];

self.addEventListener('install', function(event) {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Clear old caches
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName.startsWith('hedgi-v') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Don't cache anything, just pass through
  // This ensures fresh content is always loaded
  event.respondWith(fetch(event.request));
});