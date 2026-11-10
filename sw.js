// sw.js — SIMJAS PRO (Sistem Jadwal MI Islamiyah) — update otomatis
const CACHE_PREFIX = 'simjas-';
const CACHE_NAME = CACHE_PREFIX + 'v1'; // naikkan (v2, v3, ...) HANYA bila menambah/mengganti file di ASSETS

// File milik aplikasi (harus ada di GitHub, satu folder dengan sw.js)
const ASSETS = [
  './index.html',
  './manifest.json'
];

// Pustaka dari CDN yang dipakai index.html (disimpan agar aplikasi bisa jalan offline)
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    // CDN bersifat opsional: gagal (mis. offline saat pasang) tidak membatalkan instalasi.
    await Promise.all(CDN_ASSETS.map((u) => cache.add(u).catch(() => {})));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Hanya hapus cache lama milik aplikasi ini
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((k) => k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // File milik aplikasi sendiri: INTERNET DULU supaya update otomatis terambil.
  // Bila offline, pakai salinan di cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // Pustaka CDN, font, dll: CACHE DULU supaya cepat, offline tetap jalan.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => cached))
  );
});
