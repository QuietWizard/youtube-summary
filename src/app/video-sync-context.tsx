'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CategoryNavItem } from './layout'
import type { VideoListItem } from './page'
import type { NavCountsAdjustment } from '@/utils/video-view-filter'

export type VideoMutationFields = Partial<
  Pick<VideoListItem, 'read' | 'archived' | 'category'>
>

export type RegisteredListView = {
  getItem: (id: number) => VideoListItem | undefined
  applyChange: (id: number, change: VideoMutationFields) => void
  commitChange: (id: number) => void
  revertChange: (id: number) => void
}

type VideoSyncContextValue = {
  categories: CategoryNavItem[]
  allCount: number
  uncategorizedCount: number
  adjustCounts: (adjustment: NavCountsAdjustment) => void
  registerListView: (view: RegisteredListView) => () => void
  getListItem: (id: number) => VideoListItem | undefined
  applyListChange: (id: number, change: VideoMutationFields) => void
  commitListChange: (id: number) => void
  revertListChange: (id: number) => void
}

const VideoSyncContext = createContext<VideoSyncContextValue | null>(null)

type VideoSyncProviderProps = {
  initialCategories: CategoryNavItem[]
  initialAllCount: number
  initialUncategorizedCount: number
  children: ReactNode
}

export function VideoSyncProvider({
  initialCategories,
  initialAllCount,
  initialUncategorizedCount,
  children,
}: VideoSyncProviderProps) {
  // Seeded once from the server on mount, then only ever changed by
  // adjustCounts below. We deliberately never re-sync these to fresh
  // `initial*` props on every render: every mutation this app makes already
  // applies a delta that matches where the DB will end up (revert on
  // failure, commit on success — see videos-client.tsx / action-bar.tsx), so
  // the running local total tracks DB truth on its own. The only case where
  // it could drift is another tab/device changing data during this session,
  // which is the staleness tradeoff already accepted for offline-eventually
  // support (see the performance/optimistic-UI plan) rather than something
  // to paper over with a prop-watching effect.
  const [categories, setCategories] = useState(initialCategories)
  const [allCount, setAllCount] = useState(initialAllCount)
  const [uncategorizedCount, setUncategorizedCount] = useState(
    initialUncategorizedCount
  )
  const listViewRef = useRef<RegisteredListView | null>(null)

  const adjustCounts = useCallback((adjustment: NavCountsAdjustment) => {
    const allCountDelta = adjustment.allCountDelta
    const uncategorizedDelta = adjustment.uncategorizedDelta
    const categoryDeltas = adjustment.categoryDeltas

    if (allCountDelta) {
      setAllCount((count) => Math.max(0, count + allCountDelta))
    }

    if (uncategorizedDelta) {
      setUncategorizedCount((count) => Math.max(0, count + uncategorizedDelta))
    }

    if (categoryDeltas) {
      setCategories((current) => {
        const byLabel = new Map(
          current.map((category) => [category.label, category.count])
        )

        for (const [label, delta] of Object.entries(categoryDeltas)) {
          byLabel.set(label, Math.max(0, (byLabel.get(label) ?? 0) + delta))
        }

        return Array.from(byLabel.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => a.label.localeCompare(b.label))
      })
    }
  }, [])

  const registerListView = useCallback((view: RegisteredListView) => {
    listViewRef.current = view
    return () => {
      if (listViewRef.current === view) {
        listViewRef.current = null
      }
    }
  }, [])

  const getListItem = useCallback(
    (id: number) => listViewRef.current?.getItem(id),
    []
  )
  const applyListChange = useCallback(
    (id: number, change: VideoMutationFields) =>
      listViewRef.current?.applyChange(id, change),
    []
  )
  const commitListChange = useCallback(
    (id: number) => listViewRef.current?.commitChange(id),
    []
  )
  const revertListChange = useCallback(
    (id: number) => listViewRef.current?.revertChange(id),
    []
  )

  const value: VideoSyncContextValue = {
    categories,
    allCount,
    uncategorizedCount,
    adjustCounts,
    registerListView,
    getListItem,
    applyListChange,
    commitListChange,
    revertListChange,
  }

  return (
    <VideoSyncContext.Provider value={value}>{children}</VideoSyncContext.Provider>
  )
}

export function useVideoSync() {
  const context = useContext(VideoSyncContext)

  if (!context) {
    throw new Error('useVideoSync must be used within a VideoSyncProvider')
  }

  return context
}
