
const CACHE_NAME = 'nexus-ai-cache-v7';

// Recursos essenciais para o "shell" da aplicação
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalação: Cache dos ficheiros estáticos iniciais
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forçar ativação imediata
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Ativação: Limpeza de caches antigas e tomada de controlo imediata
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Controlar clientes imediatamente
  );
});

// Interceção de pedidos (Fetch)
self.addEventListener('fetch', (event) => {
  // 1. Ignorar pedidos API (Gemini, Google) - Sempre Rede
  if (event.request.url.includes('googleapis.com')) {
    return;
  }

  // 2. Estratégia para Navegação (HTML): Network First
  // Tenta ir à rede primeiro. Se falhar (offline), vai à cache.
  // Isto previne que a app fique presa numa versão HTML partida.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Estratégia para Recursos (JS, CSS, Imagens): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Validar se a resposta é válida
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseType = networkResponse.type;
        if (responseType === 'basic' || responseType === 'cors' || responseType === 'default') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        // Falha silenciosa na rede para recursos secundários
      });

      return cachedResponse || fetchPromise;
    })
  );
});