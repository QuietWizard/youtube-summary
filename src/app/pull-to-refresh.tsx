'use client'

import { useRef, useState, useTransition } from 'react'
import type { ReactNode, TouchEvent as ReactTouchEvent } from 'react'
import { useRouter } from 'next/navigation'

const PULL_THRESHOLD = 64
const MAX_PULL = 96
const RESISTANCE = 0.45

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pullDistance, setPullDistance] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartY = useRef<number | null>(null)

  function handleTouchStart(event: ReactTouchEvent) {
    if (isPending || window.scrollY > 0) {
      touchStartY.current = null
      return
    }
    touchStartY.current = event.touches[0].clientY
  }

  function handleTouchMove(event: ReactTouchEvent) {
    if (touchStartY.current === null) return

    const delta = event.touches[0].clientY - touchStartY.current

    if (delta <= 0 || window.scrollY > 0) {
      touchStartY.current = null
      setIsDragging(false)
      setPullDistance(0)
      return
    }

    setIsDragging(true)
    setPullDistance(Math.min(delta * RESISTANCE, MAX_PULL))
  }

  function handleTouchEnd() {
    if (touchStartY.current === null) return
    touchStartY.current = null
    setIsDragging(false)

    if (pullDistance >= PULL_THRESHOLD) {
      setPullDistance(0)
      startTransition(() => {
        router.refresh()
      })
    } else {
      setPullDistance(0)
    }
  }

  const isRefreshing = isPending
  const showIndicator = pullDistance > 0 || isRefreshing
  const indicatorHeight = isRefreshing ? 48 : pullDistance
  const spinProgress = Math.min(pullDistance / PULL_THRESHOLD, 1)

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`flex items-center justify-center overflow-hidden ${
          isDragging ? '' : 'transition-[height] duration-200 ease-out'
        }`}
        style={{ height: indicatorHeight }}
        aria-hidden={!showIndicator}
      >
        {showIndicator && (
          <div
            className={`size-6 rounded-full border-2 border-qw-border-strong border-t-qw-accent ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={
              isRefreshing
                ? undefined
                : { transform: `rotate(${spinProgress * 360}deg)`, opacity: spinProgress }
            }
          />
        )}
      </div>
      {children}
    </div>
  )
}
