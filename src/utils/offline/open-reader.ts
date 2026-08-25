'use client'

// A way to ask the in-page offline reader (rendered by offline-indicator.tsx)
// to open from anywhere in the app, without prop-drilling or a context —
// used when a component needs to show it as a substitute for a navigation
// it's deliberately not attempting (see action-bar.tsx's handleArchive:
// archiving while offline shouldn't try to router.push back to the list,
// since that navigation itself can fail badly offline on some browsers).
const OPEN_READER_EVENT = 'offline:open-reader'

export function requestOpenReader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_READER_EVENT))
  }
}

export function subscribeToOpenReaderRequests(callback: () => void) {
  window.addEventListener(OPEN_READER_EVENT, callback)
  return () => window.removeEventListener(OPEN_READER_EVENT, callback)
}
