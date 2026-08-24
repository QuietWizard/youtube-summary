'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllOfflineVideos, getSyncedAt } from '@/utils/offline/db'
import type { OfflineVideo } from '@/utils/offline/db'

export default function OfflinePage() {
  const [videos, setVideos] = useState<OfflineVideo[] | null>(null)
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [storedVideos, storedSyncedAt] = await Promise.all([
        getAllOfflineVideos(),
        getSyncedAt(),
      ])

      if (cancelled) return

      storedVideos.sort((a, b) => (b.videoPublished ?? '').localeCompare(a.videoPublished ?? ''))
      setVideos(storedVideos)
      setSyncedAt(storedSyncedAt ?? null)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const activeVideo = videos?.find((video) => video.id === activeId) ?? null

  return (
    <div className="mx-auto min-h-screen max-w-[880px] bg-qw-bg px-6 py-8">
      <div className="mb-7 flex items-center justify-between gap-3 border-b border-qw-border pb-5">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.2em] text-qw-accent uppercase">
            Offline
          </div>
          <h1 className="font-display text-[22px] font-semibold text-qw-fg-1">
            Saved for reading
          </h1>
          <p className="mt-1 text-[13px] text-qw-muted-2">
            {syncedAt
              ? `Saved as of ${formatSyncedAt(syncedAt)}. Reconnect to see the latest.`
              : 'Nothing saved locally yet — open the app once while online to sync.'}
          </p>
        </div>
        <Link
          href="/"
          className="h-9 shrink-0 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
        >
          Try going online
        </Link>
      </div>

      {activeVideo ? (
        <OfflineArticle video={activeVideo} onBack={() => setActiveId(null)} />
      ) : (
        <OfflineGrid videos={videos} onSelect={setActiveId} />
      )}
    </div>
  )
}

function OfflineGrid({
  videos,
  onSelect,
}: {
  videos: OfflineVideo[] | null
  onSelect: (id: number) => void
}) {
  if (videos === null) {
    return <p className="text-sm text-qw-muted-1">Loading saved videos…</p>
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-qw-border px-6 py-16 text-center">
        <p className="text-sm text-qw-muted-1">
          No videos are saved for offline reading yet.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {videos.map((video) => (
        <button
          key={video.id}
          type="button"
          onClick={() => onSelect(video.id)}
          className="flex flex-col overflow-hidden rounded-lg border border-qw-border bg-qw-surface-1 text-left transition-colors hover:border-qw-border-strong"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-[linear-gradient(135deg,#131B2E_0%,#0D1220_60%,#1C2B44_100%)]">
            {video.thumbnail && (
              // The service worker cache-first-serves this from i.ytimg.com,
              // so a plain <img> (no next/image optimization pass) is what
              // actually renders while offline.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://i.ytimg.com/vi/${video.videoId ?? video.id}/mqdefault.jpg`}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-3.5">
            <h3 className="line-clamp-2 font-display text-[14px] leading-snug font-semibold text-qw-fg-1">
              {video.title}
            </h3>
            <div className="text-xs text-qw-muted-1">{video.videoChannelTitle}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

function OfflineArticle({
  video,
  onBack,
}: {
  video: OfflineVideo
  onBack: () => void
}) {
  return (
    <article>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex h-[38px] items-center gap-1.5 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
      >
        Back to saved videos
      </button>

      <h1 className="mb-3 font-display text-[28px] leading-tight font-semibold text-qw-fg-1">
        {video.title || 'Untitled video'}
      </h1>
      <p className="mb-6 text-[14px] font-medium text-qw-fg-2">
        {video.videoChannelTitle || 'Unknown channel'}
      </p>

      <hr className="mb-6 border-qw-border" />

      {video.summary ? (
        <div className="font-body text-[16px] leading-[1.75] text-qw-fg-2">
          {video.summary.split('\n').map((line, index) => (
            <OfflineSummaryLine key={`${index}-${line}`} line={line} />
          ))}
        </div>
      ) : (
        <p className="text-qw-muted-1">No summary is available for this video.</p>
      )}
    </article>
  )
}

function OfflineSummaryLine({ line }: { line: string }) {
  const trimmed = line.trim()

  if (!trimmed) {
    return <div className="h-1.5" />
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h3 className="mb-2 pt-3 font-display text-[1.15em] font-semibold text-qw-fg-1">
        {trimmed.replace(/^###\s+/, '')}
      </h3>
    )
  }

  if (trimmed.startsWith('## ')) {
    return (
      <h2 className="mb-2.5 pt-4 font-display text-[1.4em] font-semibold text-qw-fg-1">
        {trimmed.replace(/^##\s+/, '')}
      </h2>
    )
  }

  if (trimmed.startsWith('- ')) {
    return (
      <p className="relative mb-2 pl-5 text-[1em] leading-[1.75] text-qw-fg-2">
        <span className="absolute left-0">–</span>
        {trimmed.replace(/^-\s+/, '')}
      </p>
    )
  }

  return <p className="mb-3.5 text-[1em] leading-[1.75] text-qw-fg-2">{trimmed}</p>
}

function formatSyncedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
