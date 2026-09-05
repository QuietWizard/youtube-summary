import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/utils/supabase/get-current-user'
import { getCategories } from '@/utils/get-categories'
import ActionBar from './action-bar'
import VideoHero from './video-hero'
import { ArticleContent, normalizeCategory } from './article-content'
import { FontSizeProvider } from './font-size-context'
import { getVideoByUrlId, isSafeRedirectTarget } from './get-video-by-url-id'
import { FONT_SIZE_COOKIE, parseFontScale } from './font-size-cookie'

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
  const selfHref = `/video/${id}${backHref !== '/' ? `?from=${encodeURIComponent(backHref)}` : ''}`
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

  // feedFrom carries the ultimate feed context through to the full-article
  // page, separately from `from` (which points back to this summary page).
  // Both Back and Archive on the full article go straight to the feed —
  // `from` is kept only as a fallback and as the redirect target for a
  // video with no full article. See article/page.tsx.
  const fullArticleHref = video.article
    ? `/video/${id}/article?from=${encodeURIComponent(selfHref)}&feedFrom=${encodeURIComponent(backHref)}`
    : null

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
            body={video.summary}
            fullArticleHref={fullArticleHref}
          />
        </FontSizeProvider>
      </article>
    </div>
  )
}

