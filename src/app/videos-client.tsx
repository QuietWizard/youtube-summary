'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Video } from '@/types/database'
import VideoCard from './video-card'

const DEFAULT_PAGE_SIZE = 20

type VideosClientProps = {
  videos: Video[]
  error: string | null
  selectedCategory: string | null
  categoryParam: string | null
  showAll: boolean
  showArchived: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  pageSizeOptions: number[]
}

export default function VideosClient({
  videos,
  error,
  selectedCategory,
  categoryParam,
  showAll,
  showArchived,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  pageSizeOptions,
}: VideosClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages
  const listHref = buildPageHref(categoryParam, showArchived, currentPage, pageSize)

  const term = searchTerm.trim().toLowerCase()
  const filteredVideos = useMemo(() => {
    if (!term) {
      return videos
    }

    return videos.filter(
      (video) =>
        (video.title ?? '').toLowerCase().includes(term) ||
        (video.videoChannelTitle ?? '').toLowerCase().includes(term)
    )
  }, [videos, term])

  const sectionEyebrow = showArchived ? 'Archive' : 'Codex Feed'
  const sectionTitle = showArchived
    ? 'Archived'
    : showAll
      ? 'All Videos'
      : !selectedCategory || selectedCategory === 'None'
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
          <h1 className="font-display text-[30px] font-semibold text-qw-fg-1">
            {sectionTitle}
          </h1>
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
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search title or channel"
            className="w-full bg-transparent text-[13px] text-qw-fg-1 outline-none placeholder:text-qw-muted-2"
          />
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-qw-border px-6 py-20 text-center">
          <p className="text-sm text-qw-muted-1">
            {showArchived
              ? 'No archived videos found.'
              : term
                ? 'No videos match your search.'
                : 'No videos found in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {filteredVideos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
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
            onChange={(event) =>
              router.push(
                buildPageHref(
                  categoryParam,
                  showArchived,
                  1,
                  Number(event.target.value)
                )
              )
            }
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
                  ? buildPageHref(categoryParam, showArchived, currentPage - 1, pageSize)
                  : buildPageHref(categoryParam, showArchived, currentPage, pageSize)
              }
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
                  href={buildPageHref(categoryParam, showArchived, item, pageSize)}
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
                  ? buildPageHref(categoryParam, showArchived, currentPage + 1, pageSize)
                  : buildPageHref(categoryParam, showArchived, currentPage, pageSize)
              }
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
  pageSize: number
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
