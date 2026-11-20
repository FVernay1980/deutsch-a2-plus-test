// Deutsch A2+ — service worker pour le dépôt de TEST uniquement.
const CACHE = 'deutsch-a2-plus-test-v021-1';
const CACHE_PREFIX = 'deutsch-a2-plus-test-';
const BASE = new URL('./', self.location.href);
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon.png',
  './icon-512.png',
  './data/catalog.json',
  './data/vocabulary.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(path => new URL(path, BASE).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { cacheName: CACHE });
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallback = await caches.match(new URL('./index.html', BASE).href, { cacheName: CACHE });
          if (fallback) return fallback;
        }
        return Response.error();
      })
  );
});
