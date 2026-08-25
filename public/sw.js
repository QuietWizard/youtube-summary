// Minimal, hand-written service worker: it only does two jobs now.
//
// 1. Cache Next's built JS/CSS chunks (/_next/static/...) as they're
//    fetched during normal browsing. These are content-hashed and
//    immutable, so cache-first with no revalidation is always correct.
//    This is what lets /offline's own chunk survive being served with no
//    network — offline-indicator.tsx prefetches that route on mount so its
//    chunk gets requested (and so cached here) before the connection drops.
// 2. When a page navigation fails outright (no network), serve the
//    precached /offline shell instead of the browser's default error page.
//
// It used to also cache-first YouTube thumbnails, but that's redundant now
// that thumbnails are downloaded once and kept in IndexedDB as blobs (see
// db.ts and use-local-thumbnail.ts) rather than relied on as evictable HTTP
// cache entries — one persistence layer for images is enough.
//
// It deliberately does NOT try to cache Next's HTML/RSC responses
// themselves — those are tied to a build id and Next's internal fetch
// protocol, a poor fit for a hand-rolled cache. Reading offline is handled
// instead by /offline, a plain client-rendered page backed by the IndexedDB
// copy kept in sync by use-background-sync.ts.
const CACHE_VERSION = 'v3'
const SHELL_CACHE = `qw-shell-${CACHE_VERSION}`
const STATIC_CACHE = `qw-static-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'
const SHELL_ASSETS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png']
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstImmutable(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
  }
})

async function cacheFirstImmutable(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}
