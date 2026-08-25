'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useBackgroundSync } from '@/utils/offline/use-background-sync'

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getIsOffline() {
  return !navigator.onLine
}

// Server has no concept of the browser's connection — assume online so the
// server-rendered HTML never claims to be offline.
function getIsOfflineServerSnapshot() {
  return false
}

export default function OfflineIndicator() {
  useBackgroundSync()
  const router = useRouter()
  const isOffline = useSyncExternalStore(
    subscribeToConnectivity,
    getIsOffline,
    getIsOfflineServerSnapshot
  )

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline caching is a progressive enhancement — ignore registration failures.
    })
  }, [])

  // Warm the /offline route while still online: this is what's clicked
  // *after* the connection is already gone, so without prefetching it here
  // ahead of time, its JS chunk would never have been fetched (and so never
  // cached — see sw.js's /_next/static handling) by the time it's needed.
  useEffect(() => {
    router.prefetch('/offline')
  }, [router])

  if (!isOffline) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-qw-accent/15 px-4 py-2 text-center text-xs font-semibold text-qw-accent">
      You&apos;re offline.
      {/* A plain hard-navigation link, not next/link: offline, Link's
          client-side RSC fetch has nothing to fall back to and fails
          silently. A real navigation is caught by the service worker's
          navigate handler and served from cache instead. */}
      <a href="/offline" className="underline underline-offset-2">
        Read saved videos
      </a>
    </div>
  )
}
