// Kill-switch service worker.
// An earlier version of this file (commit da6c31a) pre-cached `/` on install
// and served all requests cache-first with no invalidation, so any browser
// that installed that SW kept replaying whatever `/` returned at install time
// — including an AWS API Gateway 500 from a now-decommissioned host. This
// file's job is to clean up after that: claim controlled pages, wipe all
// caches, unregister, and force-reload. After one visit, no SW exists in the
// browser. The client no longer registers a SW, so this file only matters
// for legacy browsers still running an old registration.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
