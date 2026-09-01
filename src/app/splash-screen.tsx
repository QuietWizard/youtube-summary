'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

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
      <Image src="/logo-dark.png" alt="" width={96} height={96} priority className="object-contain" />
    </div>
  )
}
