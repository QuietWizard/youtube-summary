'use client'

import { useEffect, useState } from 'react'
import { SPLASH_LOGO_DATA_URI } from './splash-logo'

// Shown once per real app launch — mounted once at the root layout, which
// only ever runs on an actual page load (a fresh tab, a cold PWA launch, a
// hard refresh), never on the client-side/local-first navigations the rest
// of the app is built around, so this never re-appears mid-session.
const MIN_VISIBLE_MS = 500
const FADE_MS = 300

type Phase = 'visible' | 'fading' | 'hidden'

export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('visible')

  useEffect(() => {
    const timer = setTimeout(() => setPhase('fading'), MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== 'fading') {
      return
    }
    const timer = setTimeout(() => setPhase('hidden'), FADE_MS)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === 'hidden') {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-qw-bg transition-opacity ease-out ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- deliberately
          not next/image: even at a 96x96 render size, next/image still
          fetches the full source file over the network before it can
          resize it, and public/logo-dark.png is a ~1MB 1024x1024 source.
          That fetch is exactly the gap a cold PWA launch can't hide —
          confirmed live via frame-by-frame video: the background painted
          instantly, but the logo itself didn't appear for several hundred
          more milliseconds. A pre-compressed copy inlined as a data URI
          has no network dependency at all, so it paints in the same
          frame as the background. */}
      <img src={SPLASH_LOGO_DATA_URI} alt="" width={96} height={96} className="object-contain" />
    </div>
  )
}
