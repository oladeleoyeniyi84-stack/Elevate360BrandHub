const CACHE_NAME = "elevate360-v3";
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.png",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML navigation and API, cache-first for hashed static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always network-first for API calls, dashboard routes, and HTML navigation
  // (HTML must always be fresh so JS/CSS hashes stay in sync after deployments)
  if (
    event.request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/dashboard")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first only for hashed static assets (immutable after deployment)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (
          event.request.method === "GET" &&
          response.status === 200 &&
          (url.pathname.startsWith("/assets/") ||
            url.pathname.startsWith("/social-preview/") ||
            url.pathname === "/favicon.png" ||
            url.pathname === "/robots.txt" ||
            url.pathname === "/manifest.json")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
