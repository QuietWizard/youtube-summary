'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DEFAULT_FONT_SCALE,
  FONT_SIZE_COOKIE,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
} from './font-size-cookie'

const STEP = 10
const FONT_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type FontSizeContextValue = {
  scale: number
  increase: () => void
  decrease: () => void
  reset: () => void
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null)

export function FontSizeProvider({
  initialScale = DEFAULT_FONT_SCALE,
  children,
}: {
  initialScale?: number
  children: ReactNode
}) {
  const [scale, setScale] = useState(initialScale)

  function persist(next: number) {
    document.cookie = `${FONT_SIZE_COOKIE}=${next}; path=/; max-age=${FONT_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`
    return next
  }

  const value: FontSizeContextValue = {
    scale,
    increase: () =>
      setScale((current) => persist(Math.min(MAX_FONT_SCALE, current + STEP))),
    decrease: () =>
      setScale((current) => persist(Math.max(MIN_FONT_SCALE, current - STEP))),
    reset: () => setScale(() => persist(DEFAULT_FONT_SCALE)),
  }

  return (
    <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>
  )
}

export function useFontSize() {
  const context = useContext(FontSizeContext)

  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider')
  }

  return context
}
