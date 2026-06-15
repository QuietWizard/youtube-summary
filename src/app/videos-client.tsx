'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { archiveVideo, markVideoAsRead } from './actions'
import type { Video } from '@/types/database'

const UNCATEGORIZED = 'None'

type VideosClientProps = {
  videos: Video[]
  error: string | null
  selectedCategory: string
}

export default function VideosClient({
  videos,
  error,
  selectedCategory,
}: VideosClientProps) {
  const filteredVideos = useMemo(
    () =>
      videos.filter(
        (video) =>
          normalizeCategory(video.category) === selectedCategory &&
          video.archived !== true
      ),
    [selectedCategory, videos]
  )

  return (
    <div className="p-4 sm:p-6">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {filteredVideos.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No videos found in this category.
            </p>
          </div>
        ) : (
          filteredVideos.map((video) => (
            <Link
              key={video.id}
              href={`/video/${video.videoId || video.id}`}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-lg/10"
            >
              <article className="h-full">
                <div className="flex h-full flex-col">
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800">
                    {video.thumbnail ? (
                      <img
                        src={`https://i.ytimg.com/vi/${video.videoId || video.id}/mqdefault.jpg`}
                        alt={video.title || 'Video thumbnail'}
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
    </div>
  )
}

function ActionForm({
  action,
  children,
  danger = false,
  videoId,
}: {
  action: (formData: FormData) => void
  children: ReactNode
  danger?: boolean
  videoId: number
}) {
  const router = useRouter()

  return (
    <form
      action={async (formData) => {
        await action(formData)
        router.refresh()
      }}
    >
      <input type="hidden" name="id" value={videoId} />
      <button
        type="submit"
        className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
          danger
            ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950'
            : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
        }`}
      >
        {children}
      </button>
    </form>
  )
}

function normalizeCategory(category: string | null) {
  return category?.trim() || UNCATEGORIZED
}

function formatPublishedDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}
