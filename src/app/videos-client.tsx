'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VideoListItem } from './page'
import VideoCard from './video-card'
import { PAGE_SIZE_COOKIE, DEFAULT_PAGE_SIZE } from './page-size-cookie'
import { useVideoSync } from './video-sync-context'
import type { VideoMutationFields } from './video-sync-context'
import { useToast } from '@/components/ui/toast-provider'
import {
  isVisibleInView,
  computeNavCountsAdjustment,
  sumAdjustments,
} from '@/utils/video-view-filter'
import type { NavCountsAdjustment, VideoView } from '@/utils/video-view-filter'
import { applyLocalMutation, applyArchiveMutation } from '@/utils/offline/apply-local-mutation'
import { useLocalVideos } from './local-videos-context'
import { computeLocalFeed } from '@/utils/offline/local-feed'
import { subscribeToFeedNavigationRequests } from '@/utils/offline/feed-navigation'
import { parseFeedView, feedViewParamsFromSearchParams } from '@/utils/feed-view'
import type { FeedView } from '@/utils/feed-view'

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
  totalCount: totalCountProp,
  pageSize,
  pageSizeOptions,
  searchTerm,
}: VideosClientProps) {
  const router = useRouter()
  const { adjustCounts, registerListView, getPendingChanges, clearPendingChange } =
    useVideoSync()
  const { showError } = useToast()
  const { allVideos, hasLocalData } = useLocalVideos()

  // The view currently on screen — seeded from the server-rendered props at
  // mount, then updated in place (no remount) whenever browsing moves
  // locally instead of navigating. See navigateTo below and the click-guard
  // in offline-indicator.tsx that routes eligible clicks here via
  // subscribeToFeedNavigationRequests.
  const [view, setView] = useState<FeedView>(() => ({
    showArchived,
    showAll,
    selectedCategory,
    categoryParam,
    page: currentPage,
    pageSize,
    searchTerm,
  }))
  const [searchInput, setSearchInput] = useState(searchTerm ?? '')
  // Tracks the last view.searchTerm we've already reflected into the input,
  // so the box can be reset whenever the view changes some other way (a
  // sidebar category click, pagination, browser back/forward) without an
  // effect — adjusting state during render, not after, avoids the extra
  // render pass react-hooks/set-state-in-effect warns about. Never fires
  // while the user is actively typing: that only ever updates view.searchTerm
  // once the debounce below actually navigates.
  const [reflectedSearchTerm, setReflectedSearchTerm] = useState(searchTerm)
  if (view.searchTerm !== reflectedSearchTerm) {
    setReflectedSearchTerm(view.searchTerm)
    setSearchInput(view.searchTerm ?? '')
  }

  // The full (unpaginated) locally-filtered set for the current non-archived
  // view — recomputed whenever the view changes or `allVideos` itself does
  // (a mutation, or a fresh sync — see local-videos-context.tsx). Null (not
  // just an empty array) until the local cache has ever loaded anything, so
  // a cold start renders the server-provided `videos` prop first instead of
  // flashing "no videos found" while IndexedDB is still being read — see
  // sourceItems below. Archived videos are never cached locally (see
  // db.ts), so that view stays on the server prop permanently.
  const localFullList = useMemo(() => {
    if (view.showArchived || !hasLocalData) {
      return null
    }
    const localView: VideoView = {
      showArchived: false,
      showAll: view.showAll,
      selectedCategory: view.selectedCategory,
    }
    return computeLocalFeed(allVideos, localView, view.searchTerm)
  }, [view.showArchived, view.showAll, view.selectedCategory, view.searchTerm, allVideos, hasLocalData])

  // The page of items actually on screen for the current view: the server
  // snapshot for the archived view (unchanged from before Stage 3b), or a
  // slice of the local cache for everything else — falling back to the
  // server snapshot until the very first local computation resolves.
  const sourceItems = useMemo(() => {
    if (view.showArchived || localFullList === null) {
      return videos
    }
    const from = (view.page - 1) * view.pageSize
    return localFullList.slice(from, from + view.pageSize)
  }, [view.showArchived, view.page, view.pageSize, localFullList, videos])

  const sourceTotalCount =
    view.showArchived || localFullList === null ? totalCountProp : localFullList.length

  const currentView: VideoView = {
    showArchived: view.showArchived,
    showAll: view.showAll,
    selectedCategory: view.selectedCategory,
  }
  // Edits made while this list wasn't mounted (e.g. Archive from the article
  // page) are parked in VideoSyncContext, since that provider lives in the
  // root layout and survives navigation while this component doesn't — see
  // the comment on `pendingChangesRef` there. Fold them into the very first
  // render so an item archived elsewhere doesn't reappear until a manual
  // refresh.
  const [initialMerge] = useState(() =>
    mergeInitialItems(sourceItems, getPendingChanges(), currentView)
  )
  const [items, setItems] = useState<VideoListItem[]>(initialMerge.items)
  const [totalCount, setTotalCount] = useState(
    sourceTotalCount - initialMerge.removedCount
  )
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef = useRef(items)
  const pendingRef = useRef(new Map<number, PendingEdit>())
  const prevSourceItemsRef = useRef(sourceItems)
  // Lets the feed-navigation and popstate handlers below always read the
  // current pageSize without needing to re-subscribe on every view change —
  // they only ever set up their listener once (see the eslint-disable
  // comments on those effects).
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const totalPages = Math.max(1, Math.ceil(totalCount / view.pageSize))
  const hasPreviousPage = view.page > 1
  const hasNextPage = view.page < totalPages
  const listHref = buildPageHref(
    view.categoryParam,
    view.showArchived,
    view.page,
    view.pageSize,
    view.searchTerm
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

  // A background revalidation (a local resync, or — for the archived view —
  // a pull-to-refresh) can land while this exact view is still mounted.
  // Merge the fresh snapshot in, but keep any locally in-flight optimistic
  // intent: a pending removal hasn't necessarily been picked up yet, and a
  // pending update's fields should keep winning over a possibly-stale fresh
  // row.
  useEffect(() => {
    if (prevSourceItemsRef.current === sourceItems) {
      return
    }
    prevSourceItemsRef.current = sourceItems

    setItems(() => {
      const merged: VideoListItem[] = []
      for (const freshItem of sourceItems) {
        const pending = pendingRef.current.get(freshItem.id)
        if (pending?.type === 'remove') {
          continue
        }
        merged.push(pending?.type === 'update' ? { ...freshItem, ...pending.change } : freshItem)
      }
      return merged
    })

    const pendingRemovedCount = Array.from(pendingRef.current.values()).filter(
      (edit) => edit.type === 'remove'
    ).length
    setTotalCount(sourceTotalCount - pendingRemovedCount)
  }, [sourceItems, sourceTotalCount])

  // Moves the feed to a new view without a server round trip: updates the
  // real URL (so the address bar and back button behave correctly) and
  // updates local state directly. Used for every in-app way of changing the
  // feed's view — pagination, search, page size, and (via the click-guard
  // in offline-indicator.tsx forwarding here) sidebar category links —
  // whenever the local cache can serve the result. Never used for the
  // archived view, which always stays a real navigation.
  //
  // `replace: true` (used while the user is actively typing a search) edits
  // the current history entry instead of adding a new one, so back/forward
  // skips over individual keystrokes and lands on whatever the URL was
  // before the search started.
  //
  // A real navigation always starts scrolled at the top; a view swapped in
  // place doesn't get that for free, so it's done explicitly here — but
  // only for these forward-going moves. Browser back/forward (see the
  // popstate handler below) intentionally skips it, since that's the one
  // case where staying where you were is closer to what a real navigation
  // would already do.
  const navigateTo = useCallback((nextView: FeedView, href: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', href)
    } else {
      window.history.pushState({}, '', href)
    }
    window.scrollTo(0, 0)
    setView(nextView)
  }, [])

  useEffect(() => {
    return subscribeToFeedNavigationRequests(({ href }) => {
      const url = new URL(href, window.location.origin)
      const nextView = parseFeedView(feedViewParamsFromSearchParams(url), viewRef.current.pageSize)
      navigateTo(nextView, href)
    })
  }, [navigateTo])

  // Covers the browser's own back/forward buttons moving between feed views
  // that were reached locally (no navigation, no remount) — re-derive the
  // view from wherever the address bar landed.
  useEffect(() => {
    function handlePopState() {
      if (window.location.pathname !== '/') {
        return
      }
      const url = new URL(window.location.href)
      setView(parseFeedView(feedViewParamsFromSearchParams(url), viewRef.current.pageSize))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
      const visible = isVisibleInView(nextItem, currentView)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentView.showArchived, currentView.showAll, currentView.selectedCategory, adjustCounts]
  )

  const commitChange = useCallback((id: number) => {
    pendingRef.current.delete(id)
  }, [])

  const getItem = useCallback(
    (id: number) => itemsRef.current.find((video) => video.id === id),
    []
  )

  useEffect(() => {
    return registerListView({ getItem, applyChange, commitChange })
  }, [registerListView, getItem, applyChange, commitChange])

  const onToggleRead = useCallback(
    (id: number) => {
      const item = getItem(id)
      if (!item) return
      const nextRead = !(item.read === true)

      applyChange(id, { read: nextRead })
      commitChange(id)
      applyLocalMutation(id, 'read', nextRead)
    },
    [getItem, applyChange, commitChange]
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
      commitChange(id)
      applyArchiveMutation(id, nextArchived)
    },
    [getItem, applyChange, commitChange]
  )

  const onSelectCategory = useCallback(
    (id: number, nextCategory: string) => {
      const item = getItem(id)
      if (!item) return
      const currentCategory = item.category?.trim() || 'None'
      if (nextCategory === currentCategory) return

      applyChange(id, { category: nextCategory })
      commitChange(id)
      applyLocalMutation(id, 'category', nextCategory)
    },
    [getItem, applyChange, commitChange]
  )

  // Local browsing works offline (it's all IndexedDB), so unlike other
  // offline-blocked interactions, search only needs to fall back to a real
  // (network-dependent) navigation when the local cache hasn't synced yet.
  const canBrowseLocally = !view.showArchived && hasLocalData

  function handleSearchChange(value: string) {
    setSearchInput(value)

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }

    // Local search is just filtering an in-memory array — there's no
    // request to debounce against, so every keystroke can filter instantly.
    // The debounce below only still applies to the server-query fallback
    // (local cache not synced yet), where each keystroke really would
    // otherwise fire its own query.
    if (canBrowseLocally) {
      const nextSearchTerm = value.trim() || null
      const href = buildPageHref(view.categoryParam, view.showArchived, 1, view.pageSize, nextSearchTerm)
      navigateTo({ ...view, page: 1, searchTerm: nextSearchTerm }, href, { replace: true })
      return
    }

    searchDebounceRef.current = setTimeout(() => {
      const nextSearchTerm = value.trim() || null
      const href = buildPageHref(view.categoryParam, view.showArchived, 1, view.pageSize, nextSearchTerm)

      if (!navigator.onLine) {
        return
      }

      router.push(href)
    }, SEARCH_DEBOUNCE_MS)
  }

  function handlePageSizeChange(nextPageSize: number) {
    document.cookie = `${PAGE_SIZE_COOKIE}=${nextPageSize}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`
    const href = buildPageHref(view.categoryParam, view.showArchived, 1, nextPageSize, view.searchTerm)

    if (canBrowseLocally) {
      navigateTo({ ...view, page: 1, pageSize: nextPageSize }, href)
      return
    }

    if (!navigator.onLine) {
      showError("You're offline — this will apply next time you're online.")
      return
    }

    router.push(href)
  }

  const isUncategorizedView =
    !view.showArchived && !view.showAll && (!view.selectedCategory || view.selectedCategory === 'None')
  const sectionEyebrow = view.showArchived ? 'Archive' : 'Codex Feed'
  const sectionTitle = view.showArchived
    ? 'Archived'
    : view.showAll
      ? 'All Articles'
      : isUncategorizedView
        ? 'Uncategorized'
        : view.selectedCategory

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
            {totalCount} article{totalCount === 1 ? '' : 's'}
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
            {view.showArchived
              ? 'No archived articles found.'
              : view.searchTerm
                ? 'No articles match your search.'
                : 'No articles found in this category.'}
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
            value={view.pageSize}
            onChange={(event) => handlePageSizeChange(Number(event.target.value))}
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
                  ? buildPageHref(view.categoryParam, view.showArchived, view.page - 1, view.pageSize, view.searchTerm)
                  : buildPageHref(view.categoryParam, view.showArchived, view.page, view.pageSize, view.searchTerm)
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

            {getPageNumbers(view.page, totalPages).map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-qw-muted-2">
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildPageHref(view.categoryParam, view.showArchived, item, view.pageSize, view.searchTerm)}
                  prefetch={Math.abs(item - view.page) <= 1}
                  aria-current={item === view.page ? 'page' : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                    item === view.page
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
                  ? buildPageHref(view.categoryParam, view.showArchived, view.page + 1, view.pageSize, view.searchTerm)
                  : buildPageHref(view.categoryParam, view.showArchived, view.page, view.pageSize, view.searchTerm)
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
