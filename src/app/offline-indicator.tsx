'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useBackgroundSync } from '@/utils/offline/use-background-sync'
import OfflineReader from './offline-reader'

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
  const [isReaderOpen, setIsReaderOpen] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline caching is a progressive enhancement — ignore registration failures.
    })
  }, [])

  // Warm the /offline route while still online, as a fallback path for a
  // cold app launch while already offline (no page loaded yet to open the
  // in-page reader from). The button below deliberately doesn't rely on
  // this: some browsers (confirmed on Brave for Android, despite an active,
  // registered, controlling service worker) simply don't invoke the service
  // worker's fetch handler for a navigation made while there's no network
  // interface at all, so a real page navigation isn't a safe way to reach
  // the offline reader. Opening it in place, with no navigation involved,
  // sidesteps that entirely.
  useEffect(() => {
    router.prefetch('/offline')
  }, [router])

  return (
    <>
      {isOffline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-qw-accent/15 px-4 py-2 text-center text-xs font-semibold text-qw-accent">
          You&apos;re offline.
          <button
            type="button"
            onClick={() => setIsReaderOpen(true)}
            className="underline underline-offset-2"
          >
            Read saved videos
          </button>
        </div>
      )}

      {isReaderOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-qw-bg">
          <div className="mx-auto max-w-[880px] px-6 py-8">
            <OfflineReader onClose={() => setIsReaderOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
