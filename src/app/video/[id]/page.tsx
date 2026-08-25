import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/utils/supabase/get-current-user'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCategories } from '@/utils/get-categories'
import type { Video } from '@/types/database'
import ActionBar from './action-bar'
import VideoHero from './video-hero'
import { ArticleContent, normalizeCategory } from './article-content'
import { FontSizeProvider } from './font-size-context'
import {
  DEFAULT_FONT_SCALE,
  FONT_SIZE_COOKIE,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
} from './font-size-cookie'

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
  const user = await getCurrentUser()
  const cookieStore = await cookies()
  const initialFontScale = parseFontScale(
    cookieStore.get(FONT_SIZE_COOKIE)?.value
  )

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
      <VideoHero id={video.id} thumbnail={video.thumbnail} />

      <article className="mx-auto max-w-[880px] px-6 pb-24">
        <FontSizeProvider initialScale={initialFontScale}>
          <ActionBar
            videoId={video.id}
            backHref={backHref}
            initialCategory={normalizedCategory}
            categories={categories}
            initialRead={video.read === true}
          />

          <ArticleContent
            title={video.title}
            videoId={video.videoId}
            videoChannelId={video.videoChannelId}
            videoChannelTitle={video.videoChannelTitle}
            videoPublished={video.videoPublished}
            summary={video.summary}
          />
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
    .from('yts_info')
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
    .from('yts_info')
    .select(fields)
    .eq('id', rowId)
    .maybeSingle<VideoDetail>()

  if (rowIdError) {
    throw new Error(rowIdError.message)
  }

  return videoByRowId
}

function parseFontScale(value: string | undefined) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_FONT_SCALE
  }

  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, parsed))
}

function isSafeRedirectTarget(target: string | undefined): target is string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
}
