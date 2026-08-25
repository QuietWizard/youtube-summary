'use client'

import { useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
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

  if (!isOffline) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-qw-accent/15 px-4 py-2 text-center text-xs font-semibold text-qw-accent">
      You&apos;re offline.
      <Link href="/offline" className="underline underline-offset-2">
        Read saved videos
      </Link>
    </div>
  )
}
