// public/sw.js
const CACHE_NAME = "pantry-coach-v4";  

const FILES_TO_CACHE = [
  "/", 
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => new Response("Offline", { status: 503 }));
    })
  );
});
