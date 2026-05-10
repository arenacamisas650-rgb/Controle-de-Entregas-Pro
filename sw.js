const CACHE_NAME = 'entrega-pro-v6-profissional';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/app.js',
  '/src/config.js',
  '/src/state.js',
  '/src/storage.js',
  '/src/calculations.js',
  '/src/validators.js',
  '/src/ui/dom.js',
  '/src/ui/dashboard.js',
  '/src/ui/historico.js',
  '/src/services/api.js',
  '/src/services/auth.js',
  '/src/services/supabaseClient.js',
  '/src/services/sync.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.2/dist/umd/supabase.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow:wght@400;500;600;700;800;900&display=swap'
];

// Instalação: cacheia os assets principais
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(asset => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

// Ativação: remove caches antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first para assets, network-first para tudo mais
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Cache-first para assets estáticos
  if (e.request.url.includes('chart.js') || e.request.url.includes('supabase-js') || e.request.url.includes('leaflet') || e.request.url.includes('fonts.googleapis')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }))
    );
    return;
  }

  // Network-first com fallback para cache
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
