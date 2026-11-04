const V = "komorebi-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(["/"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  // Supabase and external API calls pass straight through
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;

  // Next.js hashed static assets: Cache-First
  if (r.url.includes("/_next/static/")) {
    e.respondWith(
      caches.match(r).then(
        (hit) =>
          hit ||
          fetch(r).then((res) => {
            const c = res.clone();
            caches.open(V).then((x) => x.put(r, c));
            return res;
          })
      )
    );
    return;
  }

  // Everything else: Network-First with Offline Cache Fallback
  e.respondWith(
    fetch(r)
      .then((res) => {
        const c = res.clone();
        caches.open(V).then((x) => x.put(r, c));
        return res;
      })
      .catch(() => caches.match(r).then((hit) => hit || caches.match("/")))
  );
});
