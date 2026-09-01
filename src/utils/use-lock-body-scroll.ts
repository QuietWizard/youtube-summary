'use client'

import { useEffect } from 'react'

// A `position: fixed` overlay covers the page visually, but that alone
// doesn't stop the page underneath from scrolling via touch on iOS.
//
// A first attempt pinned `body` to its current scroll offset via
// `position: fixed` (a common cross-browser trick), but that turned out
// to have a worse side effect on real iOS devices than the bug it fixed:
// it disrupted how iOS delegates a touch-scroll gesture to a *nested*
// `overflow-y-auto` container, freezing the overlay's own scrolling
// (confirmed live — the article stopped scrolling entirely, while a
// leftover/misdirected gesture visibly moved something behind it), and
// plausibly also disturbed sticky positioning for other elements still
// in normal flow behind it. Plain `overflow: hidden` on both `html` and
// `body` is a lighter touch — no repositioning, no layout/stacking
// change for anything else on the page — and modern iOS (particularly
// inside a standalone PWA, which doesn't have Safari's own address-bar
// show/hide animation to fight) handles it reliably enough on its own.
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return
    }

    const { style: htmlStyle } = document.documentElement
    const { style: bodyStyle } = document.body
    const previousHtmlOverflow = htmlStyle.overflow
    const previousBodyOverflow = bodyStyle.overflow

    htmlStyle.overflow = 'hidden'
    bodyStyle.overflow = 'hidden'

    return () => {
      htmlStyle.overflow = previousHtmlOverflow
      bodyStyle.overflow = previousBodyOverflow
    }
  }, [locked])
}
