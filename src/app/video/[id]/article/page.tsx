import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/utils/supabase/get-current-user'
import { getCategories } from '@/utils/get-categories'
import ActionBar from '../action-bar'
import VideoHero from '../video-hero'
import { ArticleContent, normalizeCategory } from '../article-content'
import { FontSizeProvider } from '../font-size-context'
import { getVideoByUrlId, isSafeRedirectTarget } from '../get-video-by-url-id'
import { FONT_SIZE_COOKIE, parseFontScale } from '../font-size-cookie'

// The full-article view one level below the article-summary page at
// video/[id] — "Back" here returns to that summary page (via `from`,
// which the summary page set to its own URL), not all the way to the
// feed. Redirects to the summary page for a video with no full article,
// since the "Read Full Article" link is only ever shown when one exists —
// reaching this route without one means a stale link, not a real state to
// render.
export default async function FullArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; feedFrom?: string }>
}) {
  const { id } = await params
  const { from, feedFrom } = await searchParams
  const backHref = isSafeRedirectTarget(from) ? from : `/video/${id}`
  // Where archiving redirects to — the feed, not this page's own "Back"
  // target (the summary page, which would show a now-archived video).
  // Falls back to backHref only if feedFrom is somehow missing; every
  // real link to this page (see video/[id]/page.tsx) always sets it.
  const archiveHref = isSafeRedirectTarget(feedFrom) ? feedFrom : backHref
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

  if (!video.article) {
    redirect(backHref)
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
            archiveHref={archiveHref}
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
            body={video.article}
            emptyMessage="No article text is available yet."
          />
        </FontSizeProvider>
      </article>
    </div>
  )
}
