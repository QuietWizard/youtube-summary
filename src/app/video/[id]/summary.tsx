'use client'

import { useFontSize } from './font-size-context'

type SummaryProps = {
  summary: string | null
}

export default function Summary({ summary }: SummaryProps) {
  const { scale } = useFontSize()

  return <SummaryContent summary={summary} scale={scale} />
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
      <p className="font-body text-qw-muted-1">
        No summary is available for this video.
      </p>
    )
  }

  return (
    <div className="font-body text-qw-fg-2" style={{ fontSize: `${scale}%` }}>
      {summary.split('\n').map((line, index) => (
        <SummaryLine key={`${index}-${line}`} line={line} />
      ))}
    </div>
  )
}

function SummaryLine({ line }: { line: string }) {
  const trimmed = line.trim()

  if (!trimmed) {
    return <div className="h-1.5" />
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h3 className="mb-[0.3em] pt-[0.6em] font-display text-[1.2em] font-semibold text-qw-fg-1">
        {trimmed.replace(/^###\s+/, '')}
      </h3>
    )
  }

  if (trimmed.startsWith('## ')) {
    return (
      <h2 className="mb-[0.4em] pt-[0.8em] font-display text-[1.5em] font-semibold text-qw-fg-1">
        {trimmed.replace(/^##\s+/, '')}
      </h2>
    )
  }

  if (trimmed.startsWith('- ')) {
    return (
      <p className="relative mb-[0.5em] pl-[1.2em] text-[1em] leading-[1.75] text-qw-fg-2">
        <span className="absolute left-0">–</span>
        {trimmed.replace(/^-\s+/, '')}
      </p>
    )
  }

  return (
    <p className="mb-[0.9em] text-[1em] leading-[1.75] text-qw-fg-2">
      {trimmed}
    </p>
  )
}
