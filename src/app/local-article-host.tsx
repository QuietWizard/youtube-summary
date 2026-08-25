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

// The instant path into an article: opened by the click-guard in
// offline-indicator.tsx when a clicked video already exists in local
// storage, so there's no need to navigate (and wait on a server round
// trip) to show it. Full interactive fidelity — the same ActionBar users
// get from a real page load, not the simplified read-only view
// offline-reader.tsx falls back to when a video *isn't* available locally.
export default function LocalArticleHost() {
  const { getLocalVideoById } = useLocalVideos()
  const { categories } = useVideoSync()
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    return subscribeToOpenArticleRequests(({ id, href }) => {
      setOpenId(id)
      window.history.pushState({ localArticle: id }, '', href)
    })
  }, [])

  // Covers both a user pressing the physical/browser back button and our
  // own close() below calling history.back() — either way, a popstate
  // means the address bar just moved away from this article, so the
  // overlay should follow.
  useEffect(() => {
    function handlePopState() {
      setOpenId(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const video = openId != null ? getLocalVideoById(openId) : undefined

  if (!video) {
    return null
  }

  function close() {
    window.history.back()
  }

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
              summary={video.summary}
            />
          </FontSizeProvider>
        </article>
      </div>
    </div>
  )
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
