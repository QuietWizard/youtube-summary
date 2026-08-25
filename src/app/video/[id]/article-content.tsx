import Link from 'next/link'
import Summary from './summary'

type ArticleContentProps = {
  title: string | null
  videoId: string | null
  videoChannelId: string | null
  videoChannelTitle: string | null
  videoPublished: string | null
  summary: string | null
}

// Shared between the server-rendered video/[id]/page.tsx and the client-
// rendered local-article-host.tsx (opened instantly from local storage
// when a video's already been synced) so the two render identically
// rather than risking drift between two hand-maintained copies.
export function ArticleContent({
  title,
  videoId,
  videoChannelId,
  videoChannelTitle,
  videoPublished,
  summary,
}: ArticleContentProps) {
  return (
    <>
      <div className="mb-2.5 flex items-center gap-3.5 text-[13px] font-medium text-qw-muted-1">
        <span>{formatPublishedDate(videoPublished)}</span>
        <span className="text-qw-muted-3">|</span>
        <Link
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 text-qw-accent hover:underline"
        >
          Watch on YouTube
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>
      </div>

      <h1 className="mb-3 max-w-[720px] font-display text-[34px] leading-tight font-semibold text-qw-fg-1">
        {title || 'Untitled video'}
      </h1>
      <p className="mb-7 text-[15px] font-medium text-qw-fg-2">
        <Link href={`https://www.youtube.com/channel/${videoChannelId}`}>
          {videoChannelTitle || 'Unknown channel'}
        </Link>
      </p>

      <hr className="mb-7 border-qw-border" />

      <Summary summary={summary} />
    </>
  )
}

export function normalizeCategory(category: string | null) {
  return category?.trim() || 'None'
}

export function formatPublishedDate(date: string | null) {
  if (!date) {
    return 'Publication date unknown'
  }

  // Fixed timeZone: this renders both server-side (page.tsx) and
  // client-side (local-article-host.tsx) for the same video, and a
  // Server Component rendering it isn't itself at risk of a hydration
  // mismatch, but the two must still agree on which calendar day they
  // show regardless of which environment is formatting it.
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
}
