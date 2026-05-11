const CACHE_NAME = 'entrega-pro-static-v4';
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
  './src/ui/importacao-flex.js',
  './src/ui/trabalho-ativo.js',
  './src/services/api.js',
  './src/services/auth.js',
  './src/services/clipboard.js',
  './src/services/importacao-flex.js',
  './src/services/ocr.js',
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
  const url = new URL(event.request.url);
  const networkFirst = event.request.mode === 'navigate'
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.json')
    || url.pathname.endsWith('.html');

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
