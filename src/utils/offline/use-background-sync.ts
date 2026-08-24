'use client'

import { useEffect } from 'react'
import { replaceAllVideos } from './db'
import type { OfflineVideo } from './db'

const SYNC_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

// Keeps the offline (IndexedDB) copy of the unarchived library warm: on
// mount, on reconnect, and on a slow background interval. This is
// deliberately separate from the normal server-rendered pages — it never
// blocks or affects what's on screen, it just makes sure there's something
// recent to fall back to if the connection drops.
export function useBackgroundSync() {
  useEffect(() => {
    let cancelled = false

    async function sync() {
      if (!navigator.onLine) {
        return
      }

      try {
        const response = await fetch('/api/sync', { cache: 'no-store' })
        if (!response.ok || cancelled) {
          return
        }

        const { videos } = (await response.json()) as { videos: OfflineVideo[] }
        if (!cancelled) {
          await replaceAllVideos(videos)
        }
      } catch {
        // Best-effort — the offline cache just stays at its last-known state.
      }
    }

    sync()
    const interval = setInterval(sync, SYNC_INTERVAL_MS)
    window.addEventListener('online', sync)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('online', sync)
    }
  }, [])
}
