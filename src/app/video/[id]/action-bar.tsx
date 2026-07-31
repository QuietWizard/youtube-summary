'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  archiveVideo,
  createCategoryAndAssignToVideo,
  markVideoAsRead,
  updateVideoCategory,
} from '@/app/actions'
import { useFontSize } from './font-size-context'
import { useVideoSync } from '@/app/video-sync-context'
import { useOptimisticMutation } from '@/utils/use-optimistic-mutation'
import { useToast } from '@/components/ui/toast-provider'
import { computeNavCountsAdjustment, negateAdjustment } from '@/utils/video-view-filter'

type ActionBarProps = {
  videoId: number
  title: string | null
  backHref: string
  initialCategory: string
  categories: string[]
  initialRead: boolean
}

export default function ActionBar({
  videoId,
  title,
  backHref,
  initialCategory,
  categories,
  initialRead,
}: ActionBarProps) {
  const router = useRouter()
  const { scale, increase, decrease, reset } = useFontSize()
  const { adjustCounts } = useVideoSync()
  const { mutate } = useOptimisticMutation()
  const { showError } = useToast()
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [newCategory, setNewCategory] = useState('')
  const [isRead, setIsRead] = useState(initialRead)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return
    }

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCategoryMenuOpen])

  function selectCategory(category: string) {
    setIsCategoryMenuOpen(false)
    setNewCategory('')

    if (category === selectedCategory) {
      return
    }

    const previous = selectedCategory
    setSelectedCategory(category)
    const adjustment = computeNavCountsAdjustment(
      { archived: false, category: previous },
      { archived: false, category }
    )
    adjustCounts(adjustment)

    mutate({ run: () => updateVideoCategory(videoId, category) }).then((outcome) => {
      if (outcome.ok) {
        return
      }
      setSelectedCategory(previous)
      adjustCounts(negateAdjustment(adjustment))
      showError(
        `Couldn't move "${title ?? 'this video'}" to ${
          category === 'None' ? 'Uncategorized' : category
        }.`
      )
    })
  }

  function handleCreateCategory() {
    const trimmed = newCategory.trim()

    if (!trimmed) {
      return
    }

    const existingMatch = categories.find(
      (category) => category.toLowerCase() === trimmed.toLowerCase()
    )

    if (existingMatch) {
      selectCategory(existingMatch)
      return
    }

    setIsCategoryMenuOpen(false)
    setNewCategory('')
    const previous = selectedCategory
    setSelectedCategory(trimmed)
    const adjustment = computeNavCountsAdjustment(
      { archived: false, category: previous },
      { archived: false, category: trimmed }
    )
    adjustCounts(adjustment)

    // No automatic retry here: this action inserts a new row into the
    // Categories table before updating the video, and a blind retry after a
    // dropped response could double-insert if `category` has no unique
    // constraint (unverifiable from this repo). A single attempt with the
    // usual rollback is the safe choice.
    mutate(
      { run: () => createCategoryAndAssignToVideo(videoId, trimmed) },
      { retries: 0 }
    ).then((outcome) => {
      if (outcome.ok) {
        return
      }
      setSelectedCategory(previous)
      adjustCounts(negateAdjustment(adjustment))
      showError(`Couldn't create category "${trimmed}".`)
    })
  }

  function handleMarkRead() {
    setIsRead(true)
    mutate({ run: () => markVideoAsRead(videoId) }).then((outcome) => {
      if (!outcome.ok) {
        setIsRead(false)
        showError(`Couldn't mark "${title ?? 'this video'}" as read.`)
      }
    })
  }

  function handleArchive() {
    const adjustment = computeNavCountsAdjustment(
      { archived: false, category: selectedCategory },
      { archived: true, category: selectedCategory }
    )
    adjustCounts(adjustment)
    router.push(backHref)

    mutate({ run: () => archiveVideo(videoId) }).then((outcome) => {
      if (!outcome.ok) {
        adjustCounts(negateAdjustment(adjustment))
        showError(`Couldn't archive "${title ?? 'this video'}". It was left unarchived.`)
      }
    })
  }

  const categoryOptions = ['None', ...categories.filter((c) => c !== 'None')]

  return (
    <div className="sticky top-0 z-10 -mt-7 mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-qw-border bg-qw-bg/90 py-3.5 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <Link
          href={backHref}
          className="flex h-[38px] items-center gap-1.5 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsCategoryMenuOpen((open) => !open)}
            aria-expanded={isCategoryMenuOpen}
            className="flex h-[38px] items-center gap-1.5 rounded-md border border-qw-border bg-qw-surface-1 px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
          >
            {selectedCategory}
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isCategoryMenuOpen && (
            <div className="absolute left-0 top-[44px] z-20 w-[220px] rounded-md border border-qw-border-strong bg-qw-surface-2 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
              <ul className="max-h-60 space-y-0.5 overflow-y-auto">
                {categoryOptions.map((category) => (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => selectCategory(category)}
                      className={`block w-full rounded px-2.5 py-2 text-left text-[13px] transition-colors ${
                        category === selectedCategory
                          ? 'bg-qw-surface-1 text-qw-fg-1'
                          : 'text-qw-fg-2 hover:bg-qw-surface-1'
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-qw-border pt-1.5">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleCreateCategory()
                    }
                  }}
                  placeholder="New category"
                  className="h-9 w-full min-w-0 rounded-md border border-qw-border bg-qw-surface-1 px-2 text-[13px] text-qw-fg-1 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="h-9 shrink-0 rounded-md border border-qw-border px-3 text-[13px] font-medium text-qw-fg-2 transition-colors hover:bg-qw-surface-1"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Decrease font size"
          onClick={decrease}
          className="flex size-[34px] items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 text-base text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
        >
          −
        </button>
        <button
          type="button"
          onClick={reset}
          className="h-[34px] rounded-md border border-qw-border bg-qw-surface-1 px-2.5 text-xs font-semibold text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
        >
          {scale}%
        </button>
        <button
          type="button"
          aria-label="Increase font size"
          onClick={increase}
          className="flex size-[34px] items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 text-base text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
        >
          +
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isRead ? (
          <span className="flex h-[38px] items-center gap-1.5 rounded-md border border-qw-success/35 bg-qw-success/10 px-3 text-xs font-semibold text-qw-success">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            Read
          </span>
        ) : (
          <button
            type="button"
            onClick={handleMarkRead}
            className="h-[38px] rounded-md border border-qw-border bg-qw-surface-1 px-3.5 text-xs font-semibold text-qw-fg-2 transition-colors hover:border-qw-border-strong hover:bg-qw-surface-2"
          >
            Mark as Read
          </button>
        )}
        <button
          type="button"
          onClick={handleArchive}
          className="h-[38px] rounded-md border border-qw-danger/30 bg-qw-danger/[0.08] px-3.5 text-xs font-semibold text-qw-danger-text transition-colors hover:bg-qw-danger/[0.16]"
        >
          Archive
        </button>
      </div>
    </div>
  )
}
