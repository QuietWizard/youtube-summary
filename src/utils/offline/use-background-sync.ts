'use client'

import { useEffect } from 'react'
import { getWatermark, setWatermark, syncVideoList } from './db'
import { syncThumbnails } from './sync-thumbnails'
import { flushMutationQueue } from './sync-mutations'
import type { OfflineVideo } from './db'

const SYNC_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

// Fired whenever a pull actually pulled something (as opposed to the
// watermark check finding nothing new), so anything holding its own
// in-memory copy of the local video list — see local-videos-context.tsx —
// can refresh without polling.
const SYNC_COMPLETED_EVENT = 'offline:sync-completed'

export function subscribeToSyncCompleted(callback: () => void) {
  window.addEventListener(SYNC_COMPLETED_EVENT, callback)
  return () => window.removeEventListener(SYNC_COMPLETED_EVENT, callback)
}

function notifySyncCompleted() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYNC_COMPLETED_EVENT))
  }
}

// Keeps the local (IndexedDB) copy of the unarchived library warm: on
// mount, on reconnect, and on a slow background interval. This is what
// makes offline reading, the "thumbnails survive even if the source video
// disappears" behavior, and instant local-first mutations all possible —
// see db.ts, use-local-thumbnail.ts, and sync-mutations.ts. It never
// blocks or affects what's on screen; a failed sync just leaves the local
// copy at its last-known state.
//
// Each pass pulls before it pushes: fresh server data (if anything changed
// — see /api/sync/watermark) is what lets a queued local edit be checked
// for conflicts against the *current* field_updated_at before it's pushed,
// which matters most exactly when it's been a while — reconnecting after
// being offline, or switching to a device that's been idle — since that's
// when the server is most likely to have moved on without this device.
export function useBackgroundSync() {
  useEffect(() => {
    // Best-effort request for the browser to stop treating this origin's
    // storage as evictable under disk pressure. Without this, a browser
    // can (and periodically does, on both Chrome/Android and iOS Safari)
    // clear IndexedDB for low-engagement origins to reclaim space — which
    // would silently undo the whole point of downloading this data in the
    // first place. Whether it's actually granted depends on browser
    // heuristics (install state, engagement); nothing here depends on it
    // succeeding.
    navigator.storage?.persist?.().catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    async function sync() {
      if (!navigator.onLine) {
        return
      }

      try {
        await pullIfStale(() => cancelled)
        if (cancelled) {
          return
        }
        await flushMutationQueue()
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

async function pullIfStale(isCancelled: () => boolean) {
  const watermarkResponse = await fetch('/api/sync/watermark', { cache: 'no-store' })
  if (!watermarkResponse.ok || isCancelled()) {
    return
  }

  const { watermark } = (await watermarkResponse.json()) as { watermark: string | null }
  const localWatermark = await getWatermark()

  if (watermark === localWatermark) {
    return
  }

  const response = await fetch('/api/sync', { cache: 'no-store' })
  if (!response.ok || isCancelled()) {
    return
  }

  const { videos } = (await response.json()) as { videos: OfflineVideo[] }
  if (isCancelled()) {
    return
  }

  const { idsNeedingThumbnail } = await syncVideoList(videos)
  await setWatermark(watermark)
  notifySyncCompleted()

  if (!isCancelled() && idsNeedingThumbnail.length > 0) {
    await syncThumbnails(videos, idsNeedingThumbnail)
  }
}
