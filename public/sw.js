const CACHE_NAME = "ym-liberty-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Do not cache API or audio streaming requests
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes(".mp3") ||
    event.request.url.includes("huggingface.co") ||
    event.request.url.includes("yandex")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
