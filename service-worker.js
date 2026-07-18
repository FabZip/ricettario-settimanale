const CACHE = "ricettario-antireflusso-v14";
const APP_VERSION = "1.4.3";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=1.4.3",
  "./app.js?v=1.4.3",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./data/recipes.json",
  "./app-version.json",
  "./status.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl = null) {
  const cache = await caches.open(CACHE);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }

    throw error;
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Le navigazioni devono recuperare prima l'HTML più recente.
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  // JSON remoti: sempre rete, nessun dato di versione obsoleto.
  if (
    url.pathname.includes("/database/") ||
    url.pathname.endsWith("/status.json") ||
    url.pathname.endsWith("/app-version.json")
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // File applicativi: rete prima, cache come fallback offline.
  if (
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/styles.css") ||
    url.pathname.endsWith("/manifest.webmanifest")
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Risorse statiche: cache prima.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
