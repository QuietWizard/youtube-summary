'use client'

// Requests that a video be opened as an instant, locally-rendered article
// overlay instead of navigating to it — see local-article-host.tsx (which
// renders the overlay) and the click-guard in offline-indicator.tsx (which
// decides when a click should trigger this instead of a real navigation).
const OPEN_ARTICLE_EVENT = 'offline:open-article'

export type OpenArticleRequest = {
  id: number
  // The URL the real navigation would have used — pushed into history so
  // the address bar and back button behave correctly even though no
  // navigation actually happened.
  href: string
  // Which of the two drill-down levels to show — the article summary
  // (video/[id]) or the full article (video/[id]/article). See
  // local-article-host.tsx, which re-derives this from the URL on
  // popstate rather than tracking it as a manual stack.
  variant: 'summary' | 'article'
}

export function requestOpenArticle(request: OpenArticleRequest) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<OpenArticleRequest>(OPEN_ARTICLE_EVENT, { detail: request }))
  }
}

export function subscribeToOpenArticleRequests(
  callback: (request: OpenArticleRequest) => void
) {
  function handler(event: Event) {
    callback((event as CustomEvent<OpenArticleRequest>).detail)
  }

  window.addEventListener(OPEN_ARTICLE_EVENT, handler)
  return () => window.removeEventListener(OPEN_ARTICLE_EVENT, handler)
}
