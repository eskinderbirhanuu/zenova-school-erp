const CACHE = {
  shell: "zenova-shell-v1",
  api: "zenova-api-v1",
  static: "zenova-static-v1",
};

const PRECACHE_URLS = ["/", "/login", "/offline", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE.shell).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !Object.values(CACHE).includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(networkFirst(e.request, CACHE.api));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(css|js|svg|png|jpg|woff2?)$/)
  ) {
    e.respondWith(cacheFirst(e.request, CACHE.static));
    return;
  }

  if (url.pathname === "/" || url.pathname.startsWith("/login")) {
    e.respondWith(networkFirst(e.request, CACHE.shell));
    return;
  }

  e.respondWith(networkFirst(e.request, CACHE.shell));
});

self.addEventListener("sync", (e) => {
  if (e.tag === "sync-attendance") {
    e.waitUntil(syncAttendance());
  }
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match("/");
    return new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function syncAttendance() {
  if (!navigator.onLine) return;
  try {
    const db = await openAttendanceDB();
    const tx = db.transaction("pending", "readonly");
    const store = tx.objectStore("pending");
    const records = await store.getAll();
    await tx.done;

    for (const record of records) {
      try {
        const res = await fetch("/api/v1/attendance/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record.data),
        });
        if (res.ok) {
          const deleteTx = db.transaction("pending", "readwrite");
          const deleteStore = deleteTx.objectStore("pending");
          deleteStore.delete(record.id);
          await deleteTx.done;
        }
      } catch {
        // Will retry on next sync
      }
    }
  } catch {
    // IndexedDB not available
  }
}

function openAttendanceDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("zenova-attendance", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
