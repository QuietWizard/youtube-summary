// Minimal, hand-written service worker: it only does two jobs.
//
// 1. Cache YouTube thumbnails (cache-first, refreshed in the background) so
//    saved artwork still renders with no connection.
// 2. When a page navigation fails outright (no network), serve the
//    precached /offline shell instead of the browser's default error page.
//
// It deliberately does NOT try to cache Next's own HTML/RSC responses —
// those are tied to a build id and Next's internal fetch protocol, which
// makes them a poor fit for a hand-rolled cache. Reading offline is handled
// instead by /offline, a plain client-rendered page backed by the IndexedDB
// copy kept in sync by use-background-sync.ts.
const CACHE_VERSION = 'v1'
const SHELL_CACHE = `qw-shell-${CACHE_VERSION}`
const THUMBNAIL_CACHE = `qw-thumbnails-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'
const SHELL_ASSETS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png']

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
          keys
            .filter((key) => key !== SHELL_CACHE && key !== THUMBNAIL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.hostname === 'i.ytimg.com') {
    event.respondWith(cacheFirstWithRevalidate(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
  }
})

async function cacheFirstWithRevalidate(request) {
  const cache = await caches.open(THUMBNAIL_CACHE)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  return cached || (await network) || Response.error()
}
