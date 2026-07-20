'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VideoListItem } from './page'
import VideoCard from './video-card'
import { PAGE_SIZE_COOKIE, DEFAULT_PAGE_SIZE } from './page-size-cookie'

const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
const SEARCH_DEBOUNCE_MS = 350

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
  totalCount,
  pageSize,
  pageSizeOptions,
  searchTerm,
}: VideosClientProps) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(searchTerm ?? '')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

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

      {videos.length === 0 ? (
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
          {videos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              categories={categories}
              listHref={listHref}
              priority={index < 3}
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
