'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getAllOfflineVideos,
  subscribeToMutationsChanged,
} from '@/utils/offline/db'
import { subscribeToSyncCompleted } from '@/utils/offline/use-background-sync'
import type { OfflineVideo } from '@/utils/offline/db'

type LocalVideosContextValue = {
  getLocalVideoById: (id: number) => OfflineVideo | undefined
  // Mirrors the lookup order used server-side (video/[id]/page.tsx): the
  // route param is usually the YouTube video id, occasionally the row id.
  getLocalVideoByKey: (key: string) => OfflineVideo | undefined
}

const LocalVideosContext = createContext<LocalVideosContextValue | null>(null)

// A reactive, in-memory mirror of the IndexedDB videos store, shared across
// the app rather than re-read per component: this is what lets a video
// card decide, synchronously at click time, whether its target is already
// available locally and can be opened instantly instead of navigating —
// see local-article-host.tsx and the click-guard in offline-indicator.tsx.
export function LocalVideosProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Map<number, OfflineVideo>>(new Map())
  const [byVideoId, setByVideoId] = useState<Map<string, OfflineVideo>>(new Map())

  useEffect(() => {
    let cancelled = false

    function refresh() {
      getAllOfflineVideos().then((videos) => {
        if (cancelled) return
        setById(new Map(videos.map((video) => [video.id, video])))
        setByVideoId(
          new Map(
            videos
              .filter((video): video is OfflineVideo & { videoId: string } =>
                Boolean(video.videoId)
              )
              .map((video) => [video.videoId, video])
          )
        )
      })
    }

    refresh()
    const unsubscribeMutations = subscribeToMutationsChanged(refresh)
    const unsubscribeSync = subscribeToSyncCompleted(refresh)
    return () => {
      cancelled = true
      unsubscribeMutations()
      unsubscribeSync()
    }
  }, [])

  const value: LocalVideosContextValue = {
    getLocalVideoById: (id) => byId.get(id),
    getLocalVideoByKey: (key) => {
      const byVideoIdMatch = byVideoId.get(key)
      if (byVideoIdMatch) return byVideoIdMatch

      const rowId = Number(key)
      if (!Number.isInteger(rowId) || rowId < 1) return undefined
      return byId.get(rowId)
    },
  }

  return (
    <LocalVideosContext.Provider value={value}>{children}</LocalVideosContext.Provider>
  )
}

export function useLocalVideos() {
  const context = useContext(LocalVideosContext)

  if (!context) {
    throw new Error('useLocalVideos must be used within a LocalVideosProvider')
  }

  return context
}
