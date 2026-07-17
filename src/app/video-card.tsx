'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { DragEvent } from 'react'
import type { Video } from '@/types/database'
import {
  archiveVideo,
  markVideoAsRead,
  markVideoAsUnread,
  unarchiveVideo,
  updateVideoCategory,
} from './actions'
import { VIDEO_DRAG_MIME_TYPE } from './video-drag'

type VideoCardProps = {
  video: Video
  categories: string[]
  listHref: string
  priority: boolean
}

export default function VideoCard({
  video,
  categories,
  listHref,
  priority,
}: VideoCardProps) {
  const router = useRouter()
  const [isRead, setIsRead] = useState(video.read === true)
  const [isArchived, setIsArchived] = useState(video.archived === true)
  const [category, setCategory] = useState(video.category?.trim() || 'None')
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [, startTransition] = useTransition()
  const categoryMenuRef = useRef<HTMLDivElement>(null)

  const videoKey = video.videoId || String(video.id)
  const href = `/video/${videoKey}?from=${encodeURIComponent(listHref)}`
  const isUncategorized = category === 'None'
  const categoryOptions = ['None', ...categories.filter((c) => c !== 'None')]

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return
    }

    function handleClickOutside(event: MouseEvent) {
      if (!categoryMenuRef.current?.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCategoryMenuOpen])

  function toggleRead() {
    const next = !isRead
    setIsRead(next)
    startTransition(async () => {
      await (next ? markVideoAsRead(video.id) : markVideoAsUnread(video.id))
      router.refresh()
    })
  }

  function toggleArchive() {
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

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData(VIDEO_DRAG_MIME_TYPE, String(video.id))
    event.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  function handleDragEnd() {
    setIsDragging(false)
  }

  function selectCategory(next: string) {
    setIsCategoryMenuOpen(false)

    if (next === category) {
      return
    }

    const previous = category
    setCategory(next)
    startTransition(async () => {
      try {
        await updateVideoCategory(video.id, next)
        router.refresh()
      } catch {
        setCategory(previous)
      }
    })
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`relative flex cursor-grab flex-col rounded-lg border border-qw-border bg-qw-surface-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,border-color,box-shadow,opacity] duration-300 ease-qw hover:-translate-y-1 hover:border-qw-border-strong hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.4),0_0_24px_rgba(91,179,255,0.12)] active:cursor-grabbing ${
        isCategoryMenuOpen ? 'z-20' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <Link href={href} draggable={false} className="flex flex-1 flex-col">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-[linear-gradient(135deg,#131B2E_0%,#0D1220_60%,#1C2B44_100%)]">
          {video.thumbnail && (
            <Image
              src={`https://i.ytimg.com/vi/${videoKey}/mqdefault.jpg`}
              alt=""
              fill
              draggable={false}
              sizes="(min-width: 768px) 320px, 100vw"
              loading={priority ? 'eager' : 'lazy'}
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,9,15,0.02)_0%,rgba(7,9,15,0)_40%,rgba(7,9,15,0.55)_100%)]" />
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
        <div className="flex flex-1 flex-col p-4 pb-0">
          <h3 className="mb-2 line-clamp-2 font-display text-[15px] leading-snug font-semibold text-qw-fg-1">
            {video.title}
          </h3>
          <div className="text-xs text-qw-muted-1">
            {video.videoChannelTitle}
            {video.videoPublished && (
              <> · {formatPublishedDate(video.videoPublished)}</>
            )}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-qw-border pt-3">
          <button
            type="button"
            onClick={toggleRead}
            className="text-[11px] font-semibold text-qw-accent"
          >
            {isRead ? 'Mark Unread' : 'Mark Read'}
          </button>

          <div ref={categoryMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen((open) => !open)}
              aria-expanded={isCategoryMenuOpen}
              className="flex items-center gap-1 text-[11px] font-semibold text-qw-fg-2"
            >
              {isUncategorized ? 'Uncategorized' : category}
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isCategoryMenuOpen && (
              <div className="absolute bottom-full left-1/2 z-20 mb-2 w-[180px] -translate-x-1/2 rounded-md border border-qw-border-strong bg-qw-surface-2 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                <ul className="max-h-60 space-y-0.5 overflow-y-auto">
                  {categoryOptions.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        onClick={() => selectCategory(option)}
                        className={`block w-full rounded px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                          option === category
                            ? 'bg-qw-surface-1 text-qw-fg-1'
                            : 'text-qw-fg-2 hover:bg-qw-surface-1'
                        }`}
                      >
                        {option === 'None' ? 'Uncategorized' : option}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleArchive}
            className="text-[11px] font-semibold text-qw-muted-1"
          >
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatPublishedDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}
