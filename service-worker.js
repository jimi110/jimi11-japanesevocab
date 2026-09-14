// service-worker.js
// Service worker mínimo y seguro para la PWA "日本語 — Vocabulario Japonés".
//
// Objetivo: permitir que la web sea instalable como PWA y funcione offline
// para los archivos básicos, SIN interferir nunca con el funcionamiento
// normal de la página como web tradicional.
//
// Estrategia: "network-first" (red primero). Esto significa que, siempre
// que haya conexión, se usará la versión más reciente del servidor.
// Solo si la red falla (sin conexión) se usará la copia guardada en caché.
// Así se evita el problema típico de service workers agresivos que dejan
// "atascada" una versión antigua de la página.

const CACHE_NAME = 'nihongo-app-cache-v1';

// Solo cacheamos el "app shell" mínimo indispensable.
// Si alguno de estos archivos no existe o falla, el catch() de abajo
// evita que la instalación del service worker se rompa.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {
        // Si el precaching falla por cualquier motivo, no bloqueamos
        // la instalación del service worker ni el funcionamiento normal.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo gestionamos peticiones GET; todo lo demás pasa directo a la red
  // sin ninguna intervención del service worker.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardamos una copia en caché para uso offline futuro,
        // sin afectar a la respuesta que recibe la página.
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseClone))
          .catch(() => { /* si falla el guardado, no pasa nada */ });
        return networkResponse;
      })
      .catch(() =>
        // Sin conexión: intentamos servir desde caché.
        // Si tampoco está en caché, dejamos que el error normal del
        // navegador se muestre (comportamiento estándar sin service worker).
        caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || Promise.reject('no-cache-match');
        })
      )
  );
});
