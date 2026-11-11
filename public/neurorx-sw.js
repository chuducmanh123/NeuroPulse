/**
 * NeuroRx Progressive Web App (PWA) Service Worker
 * Scope: /neurorx
 * Strictly isolated: never intercepts /, /neurocase, /neuroguide, /neurovision, /admin, or /api
 * Reference: SPEC-neurorx.md §1 story 7 & tasks/neurorx-plan.md Task 21
 */

const swUrl = new URL(self.location.href);
const DATA_VERSION = swUrl.searchParams.get("v") || "v1-latest";
const CACHE_NAME = `neurorx-cache-${DATA_VERSION}`;

const PRECACHE_URLS = [
  "/neurorx",
  "/neurorx/manifest.webmanifest",
  "/neurorx-icon.svg",
];

// 1. Install phase: precache shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate phase: purge stale neurorx caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) => name.startsWith("neurorx-cache-") && name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch interceptor: strictly scoped to /neurorx
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin requests: ignore
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;

  // Strict Exclusion Guard: NEVER intercept other apps or API endpoints
  if (
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/neurocase") ||
    pathname.startsWith("/neuroguide") ||
    pathname.startsWith("/neurovision")
  ) {
    return;
  }

  // Handle navigation requests to /neurorx (Network-first with offline fallback)
  if (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  ) {
    if (pathname.startsWith("/neurorx")) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(async () => {
            const cached = await caches.match(request);
            if (cached) return cached;
            const fallback = await caches.match("/neurorx");
            return (
              fallback ||
              new Response("Offline - NeuroRx cached content unavailable", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              })
            );
          })
      );
      return;
    }
  }

  // Handle static assets & Next.js chunks for /neurorx (Cache-first)
  if (
    pathname.startsWith("/_next/static/") ||
    pathname === "/neurorx-icon.svg" ||
    pathname === "/neurorx/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});

// 4. Message handler for client communication
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_DATA_VERSION") {
    if (event.source) {
      event.source.postMessage({
        type: "DATA_VERSION",
        version: DATA_VERSION,
        cacheName: CACHE_NAME,
      });
    }
  }
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
