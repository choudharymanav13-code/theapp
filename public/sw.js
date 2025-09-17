// public/sw.js
const CACHE = 'pantry-coach-v5';
const ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (e) => {
  // Take control immediately
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  // Become active immediately on all clients and clear old caches
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache API or Supabase calls
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('.supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"products":[]}', { status: 200 })));
    return;
  }

  // Cache-first for static app assets
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches
        .match(e.request)
        .then(
          (resp) =>
            resp ||
            fetch(e.request).then((fetchResp) => {
              const copy = fetchResp.clone();
              caches.open(CACHE).then((cache) => cache.put(e.request, copy)).catch(() => {});
              return fetchResp;
            })
        )
        .catch(() => caches.match('/'))
    );
  }
});
