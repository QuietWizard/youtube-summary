'use client'

import { useEffect } from 'react'

// A `position: fixed` overlay covers the page visually, but on iOS Safari
// (including installed PWAs) that alone doesn't stop the page underneath
// from scrolling via touch — even `overflow: hidden` on body is
// unreliable there. Pinning the body itself to its current scroll offset
// is the fix that actually holds. Used by every full-screen overlay in
// the app (the article reader, the offline reader, the mobile nav
// drawer) whenever `locked` is true; each one's own `overflow-y-auto`
// content keeps scrolling normally, since this only affects body.
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return
    }

    const scrollY = window.scrollY
    const { body } = document
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.width = previous.width
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
