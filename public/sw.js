const CACHE_NAME = "ym-liberty-shell-v12";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./yandex.js",
  "./manifest.json",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png"
];
const APP_SHELL_URLS = new Set(
  APP_SHELL.map((asset) => new URL(asset, self.location.href).href)
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("ym-liberty-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept Yandex, auth, API, or audio requests: they must go straight
  // from the user's browser and must not be persisted by the service worker.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !APP_SHELL_URLS.has(url.href)
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) cache.put("./index.html", response.clone());
          return response;
        } catch (_) {
          return (await cache.match("./index.html")) || Response.error();
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
