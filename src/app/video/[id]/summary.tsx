'use client'

import { useState } from 'react'
import CategoryPicker from './category-picker'

const MIN_SCALE = 50
const MAX_SCALE = 200
const STEP = 10
const DEFAULT_SCALE = 100

type SummaryProps = {
  summary: string | null
  videoId: number
  initialCategory: string
  categories: string[]
}

export default function Summary({
  summary,
  videoId,
  initialCategory,
  categories,
}: SummaryProps) {
  const [scale, setScale] = useState(DEFAULT_SCALE)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CategoryPicker
          videoId={videoId}
          initialCategory={initialCategory}
          categories={categories}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease font size"
            onClick={() => setScale((value) => Math.max(MIN_SCALE, value - STEP))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-lg font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Reset font size to 100%"
            onClick={() => setScale(DEFAULT_SCALE)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            100%
          </button>
          <button
            type="button"
            aria-label="Increase font size"
            onClick={() => setScale((value) => Math.min(MAX_SCALE, value + STEP))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-lg font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            +
          </button>
        </div>
      </div>

      <SummaryContent summary={summary} scale={scale} />
    </div>
  )
}

function SummaryContent({
  summary,
  scale,
}: {
  summary: string | null
  scale: number
}) {
  if (!summary) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        No summary is available for this video.
      </p>
    )
  }

  return (
    <div className="space-y-4" style={{ fontSize: `${scale}%` }}>
      {summary.split('\n').map((line, index) => (
        <SummaryLine key={`${index}-${line}`} line={line} />
      ))}
    </div>
  )
}

function SummaryLine({ line }: { line: string }) {
  const trimmed = line.trim()

  if (!trimmed) {
    return <div className="h-2" />
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h3 className="pt-3 text-[1.25em] font-semibold text-zinc-900 dark:text-zinc-50">
        {trimmed.replace(/^###\s+/, '')}
      </h3>
    )
  }

  if (trimmed.startsWith('## ')) {
    return (
      <h2 className="pt-4 text-[1.5em] font-bold text-zinc-900 dark:text-zinc-50">
        {trimmed.replace(/^##\s+/, '')}
      </h2>
    )
  }

  if (trimmed.startsWith('- ')) {
    return (
      <p className="pl-4 text-[1em] leading-[1.75] text-zinc-700 before:mr-2 before:content-['-'] dark:text-zinc-300">
        {trimmed.replace(/^-\s+/, '')}
      </p>
    )
  }

  return (
    <p className="text-[1em] leading-[1.75] text-zinc-700 dark:text-zinc-300">
      {trimmed}
    </p>
  )
}
