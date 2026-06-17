'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Video } from '@/types/database'

const DEFAULT_PAGE_SIZE = 20

type VideosClientProps = {
  videos: Video[]
  error: string | null
  selectedCategory: string | null
  showArchived: boolean
  currentPage: number
  totalPages: number
  pageSize: number
  pageSizeOptions: number[]
}

export default function VideosClient({
  videos,
  error,
  selectedCategory,
  showArchived,
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
}: VideosClientProps) {
  const router = useRouter()
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages
  return (
    <div className="p-4 sm:p-6">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {videos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              {showArchived
                ? 'No archived videos found.'
                : 'No videos found in this category.'}
            </p>
          </div>
        ) : (
          videos.map((video, index) => (
            <Link
              key={video.id}
              href={`/video/${video.videoId || video.id}`}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-lg/10"
            >
              <article className="h-full">
                <div className="flex h-full flex-col">
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800">
                    {video.thumbnail ? (
                      <Image
                        src={`https://i.ytimg.com/vi/${video.videoId || video.id}/mqdefault.jpg`}
                        alt={video.title || 'Video thumbnail'}
                        width={320}
                        height={180}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        className="w-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-zinc-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div>
                      <h3 className="mb-1 line-clamp-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {video.title}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>{video.videoChannelTitle}</span>
                        {video.videoPublished && (
                          <span>{formatPublishedDate(video.videoPublished)}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      {video.read && (
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden="true">✓</span>
                          <span>Read</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <select
            value={pageSize}
            onChange={(event) =>
              router.push(
                buildPageHref(
                  selectedCategory,
                  showArchived,
                  1,
                  Number(event.target.value)
                )
              )
            }
            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
                  ? buildPageHref(selectedCategory, showArchived, currentPage - 1, pageSize)
                  : buildPageHref(selectedCategory, showArchived, currentPage, pageSize)
              }
              aria-disabled={!hasPreviousPage}
              className={`inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 ${
                hasPreviousPage
                  ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  : 'pointer-events-none opacity-40'
              }`}
            >
              Previous
            </Link>

            {getPageNumbers(currentPage, totalPages).map((item, index) =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-sm text-zinc-500 dark:text-zinc-400"
                >
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildPageHref(selectedCategory, showArchived, item, pageSize)}
                  aria-current={item === currentPage ? 'page' : undefined}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                    item === currentPage
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item}
                </Link>
              )
            )}

            <Link
              href={
                hasNextPage
                  ? buildPageHref(selectedCategory, showArchived, currentPage + 1, pageSize)
                  : buildPageHref(selectedCategory, showArchived, currentPage, pageSize)
              }
              aria-disabled={!hasNextPage}
              className={`inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 ${
                hasNextPage
                  ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
  category: string | null,
  showArchived: boolean,
  page: number,
  pageSize: number
) {
  const params = new URLSearchParams()

  if (showArchived) {
    params.set('archived', 'true')
  } else if (category) {
    params.set('category', category)
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

function formatPublishedDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}
