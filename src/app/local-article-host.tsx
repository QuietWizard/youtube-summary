'use client'

import { useEffect, useState } from 'react'
import { useLocalVideos } from './local-videos-context'
import { useVideoSync } from './video-sync-context'
import { subscribeToOpenArticleRequests } from '@/utils/offline/open-article'
import ActionBar from './video/[id]/action-bar'
import VideoHero from './video/[id]/video-hero'
import { ArticleContent, normalizeCategory } from './video/[id]/article-content'
import { FontSizeProvider } from './video/[id]/font-size-context'
import { FONT_SIZE_COOKIE, DEFAULT_FONT_SCALE, MIN_FONT_SCALE, MAX_FONT_SCALE } from './video/[id]/font-size-cookie'
import type { OfflineVideo } from '@/utils/offline/db'

type OpenState = { id: number; variant: 'summary' | 'article' } | null

// The instant path into an article: opened by the click-guard in
// offline-indicator.tsx when a clicked video already exists in local
// storage, so there's no need to navigate (and wait on a server round
// trip) to show it. Full interactive fidelity — the same ActionBar users
// get from a real page load, not the simplified read-only view
// offline-reader.tsx falls back to when a video *isn't* available locally.
//
// Handles both drill-down levels (article summary, full article) as one
// overlay rather than two: each open pushes its own history entry, and
// popstate re-derives which (if either) applies from the URL — the same
// "URL is the source of truth" pattern videos-client.tsx uses for feed
// navigation — so back/forward walks summary → article → feed correctly
// without this component needing to track a manual stack.
export default function LocalArticleHost() {
  const { getLocalVideoById, getLocalVideoByKey } = useLocalVideos()
  const { categories } = useVideoSync()
  const [open, setOpen] = useState<OpenState>(null)

  useEffect(() => {
    return subscribeToOpenArticleRequests(({ id, href, variant }) => {
      window.history.pushState({ localArticle: id, variant }, '', href)
      setOpen({ id, variant })
    })
  }, [])

  // Covers both a user pressing the physical/browser back button and our
  // own close() below calling history.back() — either way, re-derive
  // what (if anything) the address bar now points at.
  useEffect(() => {
    function handlePopState() {
      setOpen(deriveOpenStateFromLocation(getLocalVideoByKey))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const video = open != null ? getLocalVideoById(open.id) : undefined

  if (!video || !open) {
    return null
  }

  function close() {
    window.history.back()
  }

  const videoKey = video.videoId || String(video.id)
  const isSummary = open.variant === 'summary'
  const fullArticleHref = isSummary && video.article
    ? `/video/${videoKey}/article?from=${encodeURIComponent(window.location.pathname + window.location.search)}`
    : null

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-qw-bg">
      <div className="animate-[qws-fade-up_320ms_var(--ease-qw)]">
        <VideoHero id={video.id} thumbnail={video.thumbnail} />

        <article className="mx-auto max-w-[880px] px-6 pb-24">
          <FontSizeProvider initialScale={readFontScaleCookie()}>
            <ActionBar
              videoId={video.id}
              onClose={close}
              initialCategory={normalizeCategory(video.category)}
              categories={categories.map((category) => category.label)}
              initialRead={video.read === true}
            />

            <ArticleContent
              title={video.title}
              videoId={video.videoId}
              videoChannelId={video.videoChannelId}
              videoChannelTitle={video.videoChannelTitle}
              videoPublished={video.videoPublished}
              body={isSummary ? video.summary : video.article}
              emptyMessage={isSummary ? undefined : 'No article text is available yet.'}
              fullArticleHref={fullArticleHref}
            />
          </FontSizeProvider>
        </article>
      </div>
    </div>
  )
}

function deriveOpenStateFromLocation(
  getLocalVideoByKey: (key: string) => OfflineVideo | undefined
): OpenState {
  const pathname = window.location.pathname

  const articleMatch = pathname.match(/^\/video\/([^/]+)\/article$/)
  if (articleMatch) {
    const video = getLocalVideoByKey(decodeURIComponent(articleMatch[1]))
    return video ? { id: video.id, variant: 'article' } : null
  }

  const summaryMatch = pathname.match(/^\/video\/([^/]+)$/)
  if (summaryMatch) {
    const video = getLocalVideoByKey(decodeURIComponent(summaryMatch[1]))
    return video ? { id: video.id, variant: 'summary' } : null
  }

  return null
}

function readFontScaleCookie(): number {
  if (typeof document === 'undefined') {
    return DEFAULT_FONT_SCALE
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${FONT_SIZE_COOKIE}=([^;]*)`))
  const parsed = match ? Number(decodeURIComponent(match[1])) : NaN

  if (!Number.isFinite(parsed)) {
    return DEFAULT_FONT_SCALE
  }

  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, parsed))
}
