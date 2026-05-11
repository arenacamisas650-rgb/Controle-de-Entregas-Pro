const CACHE_NAME = 'entrega-pro-static-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/app.js',
  './src/config.js',
  './src/state.js',
  './src/storage.js',
  './src/calculations.js',
  './src/validators.js',
  './src/alerts.js',
  './src/realtime.js',
  './src/ui/dom.js',
  './src/ui/dashboard.js',
  './src/ui/historico.js',
  './src/ui/trabalho-ativo.js',
  './src/services/api.js',
  './src/services/auth.js',
  './src/services/supabaseClient.js',
  './src/services/sync.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(ASSETS.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
