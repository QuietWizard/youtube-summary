import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { Video } from '@/types/database'
import Summary from './summary'
import ActionBar from './action-bar'
import { FontSizeProvider } from './font-size-context'

type VideoDetail = Pick<
  Video,
  | 'id'
  | 'videoId'
  | 'title'
  | 'thumbnail'
  | 'videoChannelId'
  | 'videoChannelTitle'
  | 'summary'
  | 'videoPublished'
  | 'category'
  | 'read'
>

export default async function VideoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams
  const backHref = isSafeRedirectTarget(from) ? from : '/'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const video = await getVideoByUrlId(id)

  if (!video) {
    notFound()
  }

  const categories = await getCategories()
  const normalizedCategory = normalizeCategory(video.category)

  if (!categories.includes(normalizedCategory)) {
    categories.push(normalizedCategory)
    categories.sort((a, b) => a.localeCompare(b))
  }

  return (
    <div className="animate-[qws-fade-up_320ms_var(--ease-qw)]">
      <section
        className="relative flex min-h-[280px] items-end bg-qw-surface-2 bg-cover bg-center"
        style={
          video.thumbnail
            ? { backgroundImage: `url(${video.thumbnail})` }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#07090F_0%,rgba(7,9,15,0.6)_55%,rgba(7,9,15,0.15)_100%)]" />
      </section>

      <article className="mx-auto max-w-[880px] px-6 pb-24">
        <FontSizeProvider>
          <ActionBar
            videoId={video.id}
            backHref={backHref}
            initialCategory={normalizedCategory}
            categories={categories}
            initialRead={video.read === true}
          />

          <div className="mb-2.5 flex items-center gap-3.5 text-[13px] font-medium text-qw-muted-1">
            <span>{formatPublishedDate(video.videoPublished)}</span>
            <span className="text-qw-muted-3">|</span>
            <Link
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
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
            {video.title || 'Untitled video'}
          </h1>
          <p className="mb-7 text-[15px] font-medium text-qw-fg-2">
            <Link href={`https://www.youtube.com/channel/${video.videoChannelId}`}>
              {video.videoChannelTitle || 'Unknown channel'}
            </Link>
          </p>

          <hr className="mb-7 border-qw-border" />

          <Summary summary={video.summary} />
        </FontSizeProvider>
      </article>
    </div>
  )
}

async function getVideoByUrlId(id: string) {
  const supabase = await createAdminClient()
  const fields =
    'id, videoId, title, thumbnail, videoChannelId, videoChannelTitle, summary, videoPublished, category, read'

  const { data: videoByVideoId, error: videoIdError } = await supabase
    .from('YouTube-Summary')
    .select(fields)
    .eq('videoId', id)
    .maybeSingle<VideoDetail>()

  if (videoIdError) {
    throw new Error(videoIdError.message)
  }

  if (videoByVideoId) {
    return videoByVideoId
  }

  const rowId = Number(id)

  if (!Number.isInteger(rowId) || rowId < 1) {
    return null
  }

  const { data: videoByRowId, error: rowIdError } = await supabase
    .from('YouTube-Summary')
    .select(fields)
    .eq('id', rowId)
    .maybeSingle<VideoDetail>()

  if (rowIdError) {
    throw new Error(rowIdError.message)
  }

  return videoByRowId
}

async function getCategories() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('Categories').select('category')

  if (error) {
    return []
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.category?.trim())
        .filter((category): category is string => Boolean(category))
    )
  ).sort((a, b) => a.localeCompare(b))
}

function normalizeCategory(category: string | null) {
  return category?.trim() || 'None'
}

function isSafeRedirectTarget(target: string | undefined): target is string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
}

function formatPublishedDate(date: string | null) {
  if (!date) {
    return 'Publication date unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}
