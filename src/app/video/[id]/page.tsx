import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { archiveVideo, markVideoAsRead } from '@/app/actions'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import type { Video } from '@/types/database'

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
>

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  return (
    <div>
      <section
        className="relative min-h-[360px] bg-zinc-900 bg-cover bg-center"
        style={
          video.thumbnail
            ? { backgroundImage: `url(${video.thumbnail})` }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/45 to-black/20" />
      </section>

      <article className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Back
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ActionForm action={markVideoAsRead} videoId={video.id}>
              Mark as Read
            </ActionForm>
            <ActionForm action={archiveVideo} danger videoId={video.id}>
              Archive
            </ActionForm>
          </div>
        </div>

        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {formatPublishedDate(video.videoPublished)}
          {video.category && ` / ${video.category}`}
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
          {video.title || 'Untitled video'}
        </h1>
        <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">
          {video.videoChannelTitle || 'Unknown channel'}
        </p>

        <div className="mb-8 mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-200 pb-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {video.videoId && <span>Video ID: {video.videoId}</span>}
          {video.videoChannelId && (
            <span>Channel ID: {video.videoChannelId}</span>
          )}
        </div>

        <SummaryContent summary={video.summary} />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ActionForm action={markVideoAsRead} videoId={video.id}>
              Mark as Read
            </ActionForm>
            <ActionForm action={archiveVideo} danger videoId={video.id}>
              Archive
            </ActionForm>
          </div>
        </div>
      </article>
    </div>
  )
}

async function getVideoByUrlId(id: string) {
  const adminSupabase = createAdminClient()
  const fields =
    'id, videoId, title, thumbnail, videoChannelId, videoChannelTitle, summary, videoPublished, category'

  const { data: videoByVideoId, error: videoIdError } = await adminSupabase
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

  const { data: videoByRowId, error: rowIdError } = await adminSupabase
    .from('YouTube-Summary')
    .select(fields)
    .eq('id', rowId)
    .maybeSingle<VideoDetail>()

  if (rowIdError) {
    throw new Error(rowIdError.message)
  }

  return videoByRowId
}

function ActionForm({
  action,
  children,
  danger = false,
  videoId,
}: {
  action: (formData: FormData) => Promise<void>
  children: string
  danger?: boolean
  videoId: number
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={videoId} />
      <button
        type="submit"
        className={`inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
          danger
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950'
            : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
        }`}
      >
        {children}
      </button>
    </form>
  )
}

function SummaryContent({ summary }: { summary: string | null }) {
  if (!summary) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        No summary is available for this video.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {summary.split('\n').map((line, index) => (
        <SummaryLine key={`${index}-${line}`} line={line} />
      ))}
    </div>
  )
}

function SummaryLine({ line }: { line: string }) {
  const trimmed = line.trim()

  if (!trimmed) {
    return <div className="h-2" />
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h3 className="pt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {trimmed.replace(/^###\s+/, '')}
      </h3>
    )
  }

  if (trimmed.startsWith('## ')) {
    return (
      <h2 className="pt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {trimmed.replace(/^##\s+/, '')}
      </h2>
    )
  }

  if (trimmed.startsWith('- ')) {
    return (
      <p className="pl-4 text-base leading-7 text-zinc-700 before:mr-2 before:content-['-'] dark:text-zinc-300">
        {trimmed.replace(/^-\s+/, '')}
      </p>
    )
  }

  return (
    <p className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
      {trimmed}
    </p>
  )
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
