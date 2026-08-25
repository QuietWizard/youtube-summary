'use client'

import { useEffect, useState } from 'react'
import { getAllOfflineVideos, getSyncedAt } from '@/utils/offline/db'
import { useLocalThumbnail } from '@/utils/offline/use-local-thumbnail'
import type { OfflineVideo } from '@/utils/offline/db'

type OfflineReaderProps = {
  // When provided, the header shows a "Close" button that calls this
  // instead of a link back to "/" — used by the in-page overlay, where
  // there's no separate route to navigate away from.
  onClose?: () => void
}

export default function OfflineReader({ onClose }: OfflineReaderProps) {
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
    <div>
      <div className="mb-7 flex items-center justify-between gap-3 border-b border-qw-border pb-5">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.2em] text-qw-accent uppercase">
            Saved Videos
          </div>
          <h1 className="font-display text-[22px] font-semibold text-qw-fg-1">
            {activeVideo ? activeVideo.title || 'Untitled video' : 'Read what you\'ve saved'}
          </h1>
          <p className="mt-1 text-[13px] text-qw-muted-2">
            {syncedAt
              ? `Saved as of ${formatSyncedAt(syncedAt)}. Reconnect to see the latest.`
              : 'Nothing saved locally yet — open the app once while online to sync.'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="h-9 shrink-0 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
          >
            Close
          </button>
        ) : (
          // A plain hard-navigation anchor, not next/link: this page is
          // reached precisely when offline, and Link's client-side RSC
          // fetch has nothing to fall back to if the connection is still
          // down when it's clicked.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/"
            className="h-9 shrink-0 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
          >
            Try going online
          </a>
        )}
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
        <OfflineVideoCard key={video.id} video={video} onSelect={onSelect} />
      ))}
    </div>
  )
}

// Deliberately a separate, simplified component rather than the real
// VideoCard: that one is wired up for drag-and-drop reordering and the
// mark-read/category/archive server actions, none of which make sense
// against a locally-stored, read-only snapshot. Styled to match it,
// though, so this looks like the same app rather than a stripped-down
// fallback.
function OfflineVideoCard({
  video,
  onSelect,
}: {
  video: OfflineVideo
  onSelect: (id: number) => void
}) {
  const localThumbnail = useLocalThumbnail(video.id)

  return (
    <button
      type="button"
      onClick={() => onSelect(video.id)}
      className="flex flex-col overflow-hidden rounded-lg border border-qw-border bg-qw-surface-1 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,border-color,box-shadow] duration-300 ease-qw hover:-translate-y-1 hover:border-qw-border-strong hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.4),0_0_24px_rgba(91,179,255,0.12)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[linear-gradient(135deg,#131B2E_0%,#0D1220_60%,#1C2B44_100%)]">
        {localThumbnail && (
          // Local blob (see use-local-thumbnail.ts) — always what's shown
          // here, since anything in this list has already been synced.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={localThumbnail} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,9,15,0.02)_0%,rgba(7,9,15,0)_40%,rgba(7,9,15,0.55)_100%)]" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 font-display text-[14px] leading-snug font-semibold text-qw-fg-1">
          {video.title}
        </h3>
        <div className="text-xs text-qw-muted-1">
          {video.videoChannelTitle}
          {video.videoPublished && <> · {formatPublishedDate(video.videoPublished)}</>}
        </div>
      </div>
    </button>
  )
}

function OfflineArticle({
  video,
  onBack,
}: {
  video: OfflineVideo
  onBack: () => void
}) {
  const localThumbnail = useLocalThumbnail(video.id)

  return (
    <article>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex h-[38px] items-center gap-1.5 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
      >
        Back to saved videos
      </button>

      {localThumbnail && (
        <div
          className="relative -mx-6 mb-6 flex min-h-[220px] items-end overflow-hidden bg-qw-surface-2 bg-cover bg-center sm:rounded-lg"
          style={{ backgroundImage: `url(${localThumbnail})` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,#07090F_0%,rgba(7,9,15,0.6)_55%,rgba(7,9,15,0.15)_100%)]" />
        </div>
      )}

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

function formatPublishedDate(date: string) {
  // Fixed timeZone — see the identical comment in video-card.tsx. Same
  // 'use client' + SSR + hydration situation applies here.
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
}

function formatSyncedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
