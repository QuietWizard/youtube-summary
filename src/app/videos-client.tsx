'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VideoListItem } from './page'
import VideoCard from './video-card'
import { PAGE_SIZE_COOKIE, DEFAULT_PAGE_SIZE } from './page-size-cookie'
import { useVideoSync } from './video-sync-context'
import type { VideoMutationFields } from './video-sync-context'
import { useOptimisticMutation } from '@/utils/use-optimistic-mutation'
import { useToast } from '@/components/ui/toast-provider'
import {
  isVisibleInView,
  computeNavCountsAdjustment,
  negateAdjustment,
  sumAdjustments,
} from '@/utils/video-view-filter'
import type { NavCountsAdjustment, VideoView } from '@/utils/video-view-filter'
import {
  archiveVideo,
  markVideoAsRead,
  markVideoAsUnread,
  unarchiveVideo,
  updateVideoCategory,
} from './actions'

const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
const SEARCH_DEBOUNCE_MS = 350

type PendingEdit =
  | {
      type: 'update'
      original: VideoListItem
      change: VideoMutationFields
      adjustment: NavCountsAdjustment
    }
  | {
      type: 'remove'
      original: VideoListItem
      index: number
      adjustment: NavCountsAdjustment
    }

type VideosClientProps = {
  videos: VideoListItem[]
  error: string | null
  categories: string[]
  selectedCategory: string | null
  categoryParam: string | null
  showAll: boolean
  showArchived: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  pageSizeOptions: number[]
  searchTerm: string | null
}

export default function VideosClient({
  videos,
  error,
  categories,
  selectedCategory,
  categoryParam,
  showAll,
  showArchived,
  currentPage,
  totalPages,
  totalCount: totalCountProp,
  pageSize,
  pageSizeOptions,
  searchTerm,
}: VideosClientProps) {
  const router = useRouter()
  const { adjustCounts, registerListView, getPendingChanges, clearPendingChange } =
    useVideoSync()
  const { mutate } = useOptimisticMutation()
  const { showError } = useToast()
  const [searchInput, setSearchInput] = useState(searchTerm ?? '')
  const currentView: VideoView = { showArchived, showAll, selectedCategory }
  // Edits made while this list wasn't mounted (e.g. Archive from the article
  // page) are parked in VideoSyncContext, since that provider lives in the
  // root layout and survives navigation while this component doesn't — see
  // the comment on `pendingChangesRef` there. Fold them into the very first
  // render so an item archived elsewhere doesn't reappear until a manual
  // refresh.
  const [initialMerge] = useState(() =>
    mergeInitialItems(videos, getPendingChanges(), currentView)
  )
  const [items, setItems] = useState<VideoListItem[]>(initialMerge.items)
  const [totalCount, setTotalCount] = useState(
    totalCountProp - initialMerge.removedCount
  )
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef = useRef(items)
  const pendingRef = useRef(new Map<number, PendingEdit>())
  const prevVideosRef = useRef(videos)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages
  const listHref = buildPageHref(
    categoryParam,
    showArchived,
    currentPage,
    pageSize,
    searchTerm
  )

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    for (const id of initialMerge.consumedIds) {
      clearPendingChange(id)
    }
    // Only ever consume the snapshot captured for the initial render above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  // A background revalidation (e.g. pull-to-refresh) can land while this
  // exact view is still mounted. Merge the fresh snapshot in, but keep any
  // locally in-flight optimistic intent: a pending removal hasn't
  // necessarily been picked up by the server yet, and a pending update's
  // fields should keep winning over a possibly-stale fresh row.
  useEffect(() => {
    if (prevVideosRef.current === videos) {
      return
    }
    prevVideosRef.current = videos

    setItems(() => {
      const merged: VideoListItem[] = []
      for (const serverItem of videos) {
        const pending = pendingRef.current.get(serverItem.id)
        if (pending?.type === 'remove') {
          continue
        }
        merged.push(pending?.type === 'update' ? { ...serverItem, ...pending.change } : serverItem)
      }
      return merged
    })

    const pendingRemovedCount = Array.from(pendingRef.current.values()).filter(
      (edit) => edit.type === 'remove'
    ).length
    setTotalCount(totalCountProp - pendingRemovedCount)
  }, [videos, totalCountProp])

  const applyChange = useCallback(
    (id: number, change: VideoMutationFields) => {
      const item = itemsRef.current.find((video) => video.id === id)
      if (!item) {
        return
      }

      const existingPending = pendingRef.current.get(id)
      const original = existingPending?.original ?? item
      const nextItem: VideoListItem = { ...item, ...change }
      const stepAdjustment = computeNavCountsAdjustment(item, nextItem)
      const accumulatedAdjustment = existingPending
        ? sumAdjustments(existingPending.adjustment, stepAdjustment)
        : stepAdjustment
      const visible = isVisibleInView(nextItem, {
        showArchived,
        showAll,
        selectedCategory,
      })

      if (visible) {
        setItems((current) =>
          current.map((video) => (video.id === id ? nextItem : video))
        )
        pendingRef.current.set(id, {
          type: 'update',
          original,
          change: { read: nextItem.read, archived: nextItem.archived, category: nextItem.category },
          adjustment: accumulatedAdjustment,
        })
      } else {
        const index = itemsRef.current.findIndex((video) => video.id === id)
        setItems((current) => current.filter((video) => video.id !== id))
        setTotalCount((count) => count - 1)
        pendingRef.current.set(id, {
          type: 'remove',
          original,
          index,
          adjustment: accumulatedAdjustment,
        })
      }

      if (
        stepAdjustment.allCountDelta ||
        stepAdjustment.uncategorizedDelta ||
        stepAdjustment.categoryDeltas
      ) {
        adjustCounts(stepAdjustment)
      }
    },
    [showArchived, showAll, selectedCategory, adjustCounts]
  )

  const commitChange = useCallback((id: number) => {
    pendingRef.current.delete(id)
  }, [])

  const revertChange = useCallback(
    (id: number) => {
      const pending = pendingRef.current.get(id)
      if (!pending) {
        return
      }
      pendingRef.current.delete(id)

      if (pending.type === 'remove') {
        setItems((current) => {
          const next = [...current]
          next.splice(Math.min(pending.index, next.length), 0, pending.original)
          return next
        })
        setTotalCount((count) => count + 1)
      } else {
        setItems((current) =>
          current.map((video) => (video.id === id ? pending.original : video))
        )
      }

      adjustCounts(negateAdjustment(pending.adjustment))
    },
    [adjustCounts]
  )

  const getItem = useCallback(
    (id: number) => itemsRef.current.find((video) => video.id === id),
    []
  )

  useEffect(() => {
    return registerListView({ getItem, applyChange, commitChange, revertChange })
  }, [registerListView, getItem, applyChange, commitChange, revertChange])

  const onToggleRead = useCallback(
    (id: number) => {
      const item = getItem(id)
      if (!item) return
      const nextRead = !(item.read === true)

      applyChange(id, { read: nextRead })
      mutate({ run: () => (nextRead ? markVideoAsRead(id) : markVideoAsUnread(id)) }).then(
        (outcome) => {
          if (outcome.ok) {
            commitChange(id)
          } else {
            revertChange(id)
            showError(`Couldn't update "${item.title ?? 'this video'}".`)
          }
        }
      )
    },
    [getItem, applyChange, commitChange, revertChange, mutate, showError]
  )

  const onToggleArchive = useCallback(
    (id: number) => {
      const item = getItem(id)
      if (!item) return
      const nextArchived = !(item.archived === true)
      const change: VideoMutationFields = nextArchived
        ? { archived: true, read: true }
        : { archived: false }

      applyChange(id, change)
      mutate({ run: () => (nextArchived ? archiveVideo(id) : unarchiveVideo(id)) }).then(
        (outcome) => {
          if (outcome.ok) {
            commitChange(id)
          } else {
            revertChange(id)
            showError(
              `Couldn't ${nextArchived ? 'archive' : 'unarchive'} "${item.title ?? 'this video'}".`
            )
          }
        }
      )
    },
    [getItem, applyChange, commitChange, revertChange, mutate, showError]
  )

  const onSelectCategory = useCallback(
    (id: number, nextCategory: string) => {
      const item = getItem(id)
      if (!item) return
      const currentCategory = item.category?.trim() || 'None'
      if (nextCategory === currentCategory) return

      applyChange(id, { category: nextCategory })
      mutate({ run: () => updateVideoCategory(id, nextCategory) }).then((outcome) => {
        if (outcome.ok) {
          commitChange(id)
        } else {
          revertChange(id)
          showError(
            `Couldn't move "${item.title ?? 'this video'}" to ${
              nextCategory === 'None' ? 'Uncategorized' : nextCategory
            }.`
          )
        }
      })
    },
    [getItem, applyChange, commitChange, revertChange, mutate, showError]
  )

  function handleSearchChange(value: string) {
    setSearchInput(value)

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = setTimeout(() => {
      router.push(
        buildPageHref(
          categoryParam,
          showArchived,
          1,
          pageSize,
          value.trim() || null
        )
      )
    }, SEARCH_DEBOUNCE_MS)
  }

  const isUncategorizedView =
    !showArchived && !showAll && (!selectedCategory || selectedCategory === 'None')
  const sectionEyebrow = showArchived ? 'Archive' : 'Codex Feed'
  const sectionTitle = showArchived
    ? 'Archived'
    : showAll
      ? 'All Videos'
      : isUncategorizedView
        ? 'Uncategorized'
        : selectedCategory

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-20">
      {error && (
        <div className="mb-6 rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-red-200">
          {error}
        </div>
      )}

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.2em] text-qw-accent uppercase">
            {sectionEyebrow}
          </div>
          {!isUncategorizedView && (
            <h1 className="font-display text-[30px] font-semibold text-qw-fg-1">
              {sectionTitle}
            </h1>
          )}
          <div className="mt-1.5 text-[13px] text-qw-muted-2">
            {totalCount} video{totalCount === 1 ? '' : 's'}
          </div>
        </div>
        <div className="flex h-[42px] w-[280px] max-w-full items-center gap-2.5 rounded-md border border-qw-border bg-qw-surface-1 px-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4F6A8F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search title, channel, or summary"
            className="w-full bg-transparent text-[13px] text-qw-fg-1 outline-none placeholder:text-qw-muted-2"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-qw-border px-6 py-20 text-center">
          <p className="text-sm text-qw-muted-1">
            {showArchived
              ? 'No archived videos found.'
              : searchTerm
                ? 'No videos match your search.'
                : 'No videos found in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {items.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              categories={categories}
              listHref={listHref}
              priority={index < 3}
              onToggleRead={onToggleRead}
              onToggleArchive={onToggleArchive}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <label className="flex items-center gap-2 text-sm text-qw-muted-1">
          <select
            value={pageSize}
            onChange={(event) => {
              const nextPageSize = Number(event.target.value)
              document.cookie = `${PAGE_SIZE_COOKIE}=${nextPageSize}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`
              router.push(
                buildPageHref(
                  categoryParam,
                  showArchived,
                  1,
                  nextPageSize,
                  searchTerm
                )
              )
            }}
            className="h-9 rounded-md border border-qw-border bg-qw-surface-1 px-2 text-sm font-medium text-qw-fg-2"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Link
              href={
                hasPreviousPage
                  ? buildPageHref(categoryParam, showArchived, currentPage - 1, pageSize, searchTerm)
                  : buildPageHref(categoryParam, showArchived, currentPage, pageSize, searchTerm)
              }
              prefetch={hasPreviousPage}
              aria-disabled={!hasPreviousPage}
              className={`inline-flex h-9 items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 px-3 text-sm font-medium text-qw-fg-2 transition-colors ${
                hasPreviousPage
                  ? 'hover:border-qw-border-strong hover:bg-qw-surface-2'
                  : 'pointer-events-none opacity-40'
              }`}
            >
              Previous
            </Link>

            {getPageNumbers(currentPage, totalPages).map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-qw-muted-2">
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildPageHref(categoryParam, showArchived, item, pageSize, searchTerm)}
                  prefetch={Math.abs(item - currentPage) <= 1}
                  aria-current={item === currentPage ? 'page' : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                    item === currentPage
                      ? 'border-qw-accent bg-qw-accent text-qw-bg'
                      : 'border-qw-border bg-qw-surface-1 text-qw-fg-2 hover:border-qw-border-strong hover:bg-qw-surface-2'
                  }`}
                >
                  {item}
                </Link>
              )
            )}

            <Link
              href={
                hasNextPage
                  ? buildPageHref(categoryParam, showArchived, currentPage + 1, pageSize, searchTerm)
                  : buildPageHref(categoryParam, showArchived, currentPage, pageSize, searchTerm)
              }
              prefetch={hasNextPage}
              aria-disabled={!hasNextPage}
              className={`inline-flex h-9 items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 px-3 text-sm font-medium text-qw-fg-2 transition-colors ${
                hasNextPage
                  ? 'hover:border-qw-border-strong hover:bg-qw-surface-2'
                  : 'pointer-events-none opacity-40'
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function mergeInitialItems(
  serverItems: VideoListItem[],
  pending: Map<number, VideoMutationFields>,
  view: VideoView
): { items: VideoListItem[]; removedCount: number; consumedIds: number[] } {
  const items: VideoListItem[] = []
  const consumedIds: number[] = []
  let removedCount = 0

  for (const serverItem of serverItems) {
    const change = pending.get(serverItem.id)

    if (!change) {
      items.push(serverItem)
      continue
    }

    consumedIds.push(serverItem.id)
    const nextItem = { ...serverItem, ...change }

    if (isVisibleInView(nextItem, view)) {
      items.push(nextItem)
    } else {
      removedCount += 1
    }
  }

  return { items, removedCount, consumedIds }
}

function buildPageHref(
  categoryParam: string | null,
  showArchived: boolean,
  page: number,
  pageSize: number,
  search: string | null
) {
  const params = new URLSearchParams()

  if (showArchived) {
    params.set('archived', 'true')
  } else if (categoryParam) {
    params.set('category', categoryParam)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(pageSize))
  }

  if (search) {
    params.set('search', search)
  }

  const query = params.toString()
  return query ? `/?${query}` : '/'
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: (number | 'ellipsis')[] = []
  const addPage = (page: number) => {
    if (!pages.includes(page)) {
      pages.push(page)
    }
  }

  addPage(1)

  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  for (
    let page = Math.max(2, currentPage - 1);
    page <= Math.min(totalPages - 1, currentPage + 1);
    page += 1
  ) {
    addPage(page)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  if (totalPages > 1) {
    addPage(totalPages)
  }

  return pages
}
