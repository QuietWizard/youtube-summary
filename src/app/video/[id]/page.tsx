import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { archiveVideo, markVideoAsRead } from '@/app/actions'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { Video } from '@/types/database'
import Summary from './summary'

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

  const categories = await getCategories()
  const normalizedCategory = normalizeCategory(video.category)

  if (!categories.includes(normalizedCategory)) {
    categories.push(normalizedCategory)
    categories.sort((a, b) => a.localeCompare(b))
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
            <ActionForm action={markVideoAsRead} videoId={video.id} isRead={video.read === true}>
              Mark as Read
            </ActionForm>
            <ActionForm action={archiveVideo} danger videoId={video.id}>
              Archive
            </ActionForm>
          </div>
        </div>

        <p className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {formatPublishedDate(video.videoPublished)}
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
          {video.title || 'Untitled video'}
        </h1>
        <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">
          <span className="mr-4">
            <Link
              href={`https://www.youtube.com/channel/${video.videoChannelId}`}
            >
              {video.videoChannelTitle || 'Unknown channel'}
            </Link>
          </span>|<span className="ml-4">
            <Link href={`https://www.youtube.com/watch?v=${video.videoId}`}>
              Watch on YouTube
            </Link>
          </span>              
        </p>

        <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

        <Summary
          summary={video.summary}
          videoId={video.id}
          initialCategory={normalizedCategory}
          categories={categories}
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ActionForm action={markVideoAsRead} videoId={video.id} isRead={video.read === true}>
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

function ActionForm({
  action,
  children,
  danger = false,
  isRead = false,
  videoId,
}: {
  action: (formData: FormData) => Promise<void>
  children: string
  danger?: boolean
  isRead?: boolean
  videoId: number
}) {
  if (isRead) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clipRule="evenodd"
          />
        </svg>
        Marked as Read
      </span>
    )
  }

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
