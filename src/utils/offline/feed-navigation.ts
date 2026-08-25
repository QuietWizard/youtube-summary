'use client'

// Requests that the feed (the video list at "/") switch views locally
// instead of navigating — see the click-guard in offline-indicator.tsx
// (which decides when a click qualifies) and videos-client.tsx (which owns
// the feed and renders the result). Only ever fired for non-archived
// targets, since archived videos aren't kept in the local cache.
const FEED_NAVIGATE_EVENT = 'offline:feed-navigate'

export type FeedNavigateRequest = {
  // The URL the real navigation would have used — pushed into history so
  // the address bar and back button behave correctly even though no
  // navigation actually happened.
  href: string
}

export function requestFeedNavigation(request: FeedNavigateRequest) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<FeedNavigateRequest>(FEED_NAVIGATE_EVENT, { detail: request }))
  }
}

export function subscribeToFeedNavigationRequests(
  callback: (request: FeedNavigateRequest) => void
) {
  function handler(event: Event) {
    callback((event as CustomEvent<FeedNavigateRequest>).detail)
  }

  window.addEventListener(FEED_NAVIGATE_EVENT, handler)
  return () => window.removeEventListener(FEED_NAVIGATE_EVENT, handler)
}
