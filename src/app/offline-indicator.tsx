'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useBackgroundSync } from '@/utils/offline/use-background-sync'
import { usePendingMutationCount } from '@/utils/offline/use-pending-mutation-count'
import { subscribeToOpenReaderRequests } from '@/utils/offline/open-reader'
import { requestOpenArticle } from '@/utils/offline/open-article'
import { requestFeedNavigation } from '@/utils/offline/feed-navigation'
import { useLocalVideos } from './local-videos-context'
import { useLockBodyScroll } from '@/utils/use-lock-body-scroll'
import OfflineReader from './offline-reader'

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getIsOffline() {
  return !navigator.onLine
}

// Server has no concept of the browser's connection — assume online so the
// server-rendered HTML never claims to be offline.
function getIsOfflineServerSnapshot() {
  return false
}

export default function OfflineIndicator() {
  useBackgroundSync()
  const router = useRouter()
  const isOffline = useSyncExternalStore(
    subscribeToConnectivity,
    getIsOffline,
    getIsOfflineServerSnapshot
  )
  const pendingCount = usePendingMutationCount()
  const { getLocalVideoByKey, hasLocalData } = useLocalVideos()
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  useLockBodyScroll(isReaderOpen)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline caching is a progressive enhancement — ignore registration failures.
    })
  }, [])

  // Warm the /offline route while still online, as a fallback path for a
  // cold app launch while already offline (no page loaded yet to open the
  // in-page reader from). The button below deliberately doesn't rely on
  // this: some browsers (confirmed on Brave for Android, despite an active,
  // registered, controlling service worker) simply don't invoke the service
  // worker's fetch handler for a navigation made while there's no network
  // interface at all, so a real page navigation isn't a safe way to reach
  // the offline reader. Opening it in place, with no navigation involved,
  // sidesteps that entirely.
  useEffect(() => {
    router.prefetch('/offline')
  }, [router])

  // Lets other components (e.g. action-bar.tsx, when it deliberately skips
  // navigating back after an offline archive) ask for the reader without
  // needing a prop or context connection to this component.
  useEffect(() => subscribeToOpenReaderRequests(() => setIsReaderOpen(true)), [])

  // Three things happen here for any same-origin link click, in order:
  //
  // 1. If it points at a specific video's article summary or full article
  //    and that content is already synced locally, open it instantly
  //    instead of navigating — online or offline, since there's no reason
  //    to wait on (or risk) a server round trip for something already
  //    sitting in IndexedDB. See local-article-host.tsx.
  // 2. If it points at the feed itself ("/") for a non-archived view, and
  //    the local cache has ever synced, switch views locally instead of
  //    navigating — the whole unarchived catalog already lives in
  //    IndexedDB, so category/search/pagination browsing needs nothing
  //    from the server. See videos-client.tsx. Archived-view links are
  //    deliberately excluded: archived videos are never cached locally.
  // 3. Otherwise, while offline: anything else (an archived-view link, or
  //    feed browsing before the first sync has ever completed, or an
  //    unsynced video) would attempt a client-side navigation fetch that's
  //    guaranteed to fail. There's no way to catch that failure after the
  //    fact and recover gracefully — router.push and Link give back no
  //    promise to catch — so the fallback is to stop it before it starts
  //    and show the simplified offline reader instead.
  //
  // Runs in the capture phase to win the race against Next's own Link
  // click handler.
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }

      if (url.origin !== window.location.origin) {
        return
      }

      const fullArticleMatch = url.pathname.match(/^\/video\/([^/]+)\/article$/)
      if (fullArticleMatch) {
        const localVideo = getLocalVideoByKey(decodeURIComponent(fullArticleMatch[1]))
        if (localVideo?.article) {
          event.preventDefault()
          requestOpenArticle({ id: localVideo.id, href, variant: 'article' })
          return
        }
      }

      const summaryMatch = url.pathname.match(/^\/video\/([^/]+)$/)
      if (summaryMatch) {
        const localVideo = getLocalVideoByKey(decodeURIComponent(summaryMatch[1]))
        if (localVideo) {
          event.preventDefault()
          requestOpenArticle({ id: localVideo.id, href, variant: 'summary' })
          return
        }
      }

      if (url.pathname === '/' && url.searchParams.get('archived') !== 'true' && hasLocalData) {
        event.preventDefault()
        requestFeedNavigation({ href })
        return
      }

      if (!navigator.onLine) {
        event.preventDefault()
        setIsReaderOpen(true)
      }
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [getLocalVideoByKey, hasLocalData])

  return (
    <>
      {isOffline ? (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-qw-accent/15 px-4 py-2 text-center text-xs font-semibold text-qw-accent">
          You&apos;re offline
          {pendingCount > 0 ? ` — ${pendingText(pendingCount)} will sync once you're back online` : ''}
          .
          <button
            type="button"
            onClick={() => setIsReaderOpen(true)}
            className="underline underline-offset-2"
          >
            Read saved articles
          </button>
        </div>
      ) : (
        pendingCount > 0 && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-qw-accent/10 px-4 py-1.5 text-center text-xs font-medium text-qw-muted-1">
            Syncing {pendingText(pendingCount)}…
          </div>
        )
      )}

      {isReaderOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-qw-bg">
          <div className="mx-auto max-w-[880px] px-6 py-8">
            <OfflineReader onClose={() => setIsReaderOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}

function pendingText(count: number) {
  return `${count} change${count === 1 ? '' : 's'}`
}
