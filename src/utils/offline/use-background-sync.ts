'use client'

import { useEffect } from 'react'
import { syncVideoList } from './db'
import { syncThumbnails } from './sync-thumbnails'
import type { OfflineVideo } from './db'

const SYNC_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

// Keeps the local (IndexedDB) copy of the unarchived library warm: on
// mount, on reconnect, and on a slow background interval. This is what
// makes both offline reading and the "thumbnails survive even if the
// source video disappears" behavior possible — see db.ts and
// use-local-thumbnail.ts. It never blocks or affects what's on screen; a
// failed sync just leaves the local copy at its last-known state.
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
        if (cancelled) {
          return
        }

        const { addedIds } = await syncVideoList(videos)
        if (cancelled || addedIds.length === 0) {
          return
        }

        await syncThumbnails(videos, addedIds)
      } catch {
        // Best-effort — the local cache just stays at its last-known state.
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
