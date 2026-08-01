// ============================================================
// service-worker.js – Offline Caching für die PWA
// ============================================================
// Strategie: Cache-First für App-Shell, Network-First für APIs
// ============================================================

const CACHE_NAME = 'habit-tracker-v1';

// Dateien, die beim Install gecacht werden (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/config.js',
  '/storage.js',
  '/avatar.js',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ---- INSTALL: App-Shell cachen ----
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: Alte Caches löschen ----
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: Cache-First mit Network-Fallback ----
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Nur GET-Requests cachen
  if (request.method !== 'GET') return;

  // Externe CDN-Requests (Chart.js, Fonts) → Network first, dann Cache
  if (request.url.includes('cdn.jsdelivr.net') || request.url.includes('fonts.googleapis.com') || request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App-Shell → Cache first, dann Network
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // Nur gültige Responses cachen
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
      .catch(() => {
        // Fallback für Navigation → index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
