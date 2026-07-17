'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import type { Video } from '@/types/database'
import {
  archiveVideo,
  markVideoAsRead,
  markVideoAsUnread,
  unarchiveVideo,
} from './actions'

type VideoCardProps = {
  video: Video
  listHref: string
  priority: boolean
}

export default function VideoCard({ video, listHref, priority }: VideoCardProps) {
  const router = useRouter()
  const [isRead, setIsRead] = useState(video.read === true)
  const [isArchived, setIsArchived] = useState(video.archived === true)
  const [, startTransition] = useTransition()

  const videoKey = video.videoId || String(video.id)
  const href = `/video/${videoKey}?from=${encodeURIComponent(listHref)}`
  const categoryLabel =
    video.category?.trim() && video.category !== 'None'
      ? video.category
      : 'Uncategorized'

  function toggleRead(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const next = !isRead
    setIsRead(next)
    startTransition(async () => {
      await (next ? markVideoAsRead(video.id) : markVideoAsUnread(video.id))
      router.refresh()
    })
  }

  function toggleArchive(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    const next = !isArchived
    setIsArchived(next)
    if (next) {
      setIsRead(true)
    }
    startTransition(async () => {
      await (next ? archiveVideo(video.id) : unarchiveVideo(video.id))
      router.refresh()
    })
  }

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-lg border border-qw-border bg-qw-surface-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,border-color,box-shadow] duration-300 ease-qw hover:-translate-y-1 hover:border-qw-border-strong hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.4),0_0_24px_rgba(91,179,255,0.12)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[linear-gradient(135deg,#131B2E_0%,#0D1220_60%,#1C2B44_100%)]">
        {video.thumbnail && (
          <Image
            src={`https://i.ytimg.com/vi/${videoKey}/mqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 768px) 320px, 100vw"
            loading={priority ? 'eager' : 'lazy'}
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,9,15,0.02)_0%,rgba(7,9,15,0)_40%,rgba(7,9,15,0.55)_100%)]" />
        <div className="absolute top-2.5 left-2.5 rounded-full border border-white/25 bg-[rgba(13,18,32,0.45)] px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] text-qw-fg-1 uppercase shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-[10px] backdrop-saturate-[1.6]">
          {categoryLabel}
        </div>
        {isRead && (
          <div className="absolute top-2 right-2 flex size-[26px] items-center justify-center rounded-full border border-qw-success/50 bg-[rgba(13,18,32,0.4)] shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-[10px] backdrop-saturate-[1.6]">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="#3DD68C">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 line-clamp-2 font-display text-[15px] leading-snug font-semibold text-qw-fg-1">
          {video.title}
        </h3>
        <div className="mb-3.5 text-xs text-qw-muted-1">
          {video.videoChannelTitle}
          {video.videoPublished && (
            <> · {formatPublishedDate(video.videoPublished)}</>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-qw-border pt-3">
          <button
            type="button"
            onClick={toggleRead}
            className="text-[11px] font-semibold text-qw-accent"
          >
            {isRead ? 'Mark Unread' : 'Mark Read'}
          </button>
          <button
            type="button"
            onClick={toggleArchive}
            className="text-[11px] font-semibold text-qw-muted-1"
          >
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>
    </Link>
  )
}

function formatPublishedDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}
