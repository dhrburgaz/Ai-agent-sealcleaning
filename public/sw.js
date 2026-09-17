/**
 * Phase 8 — minimal PWA service worker.
 *
 * This app is a live operational dashboard (see app/layout.tsx's
 * `export const dynamic = 'force-dynamic'` comment): every dashboard page
 * reads session/DB state that can change between requests (leads, prices,
 * quotes). Caching that HTML would mean showing the owner stale business
 * data as if it were current — exactly the kind of fabrication the master
 * spec forbids. So this worker deliberately does NOT do an app-shell/offline
 * cache of dashboard routes.
 *
 * Its only job is to satisfy PWA installability (a service worker with a
 * fetch handler) and give the small set of truly static assets (icon,
 * manifest) a cache-first path. Everything else passes straight through to
 * the network, unmodified — offline dashboard use is out of scope by design,
 * not an oversight.
 */

const STATIC_CACHE = 'beyza-static-v1';
const STATIC_ASSETS = ['/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !STATIC_ASSETS.includes(url.pathname)) {
    return; // let the browser handle everything else normally (network passthrough)
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});
