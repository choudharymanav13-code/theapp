// public/sw.js

// 🔄 bump version every deploy (important!)
const CACHE_NAME = "pantry-coach-v4";  

// Files to pre-cache (optional: keep minimal)
const FILES_TO_CACHE = [
  "/", 
  "/manifest.json"
];

// Install
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install");
  self.skipWaiting(); // take control immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Activate
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // take over all tabs immediately
});

// Fetch
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() =>
          // fallback for offline
          new Response("Offline", { status: 503 })
        )
      );
    })
  );
});
