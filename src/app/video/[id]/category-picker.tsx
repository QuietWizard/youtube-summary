'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  createCategoryAndAssignToVideo,
  updateVideoCategory,
} from '@/app/actions'

type CategoryPickerProps = {
  videoId: number
  initialCategory: string
  categories: string[]
}

export default function CategoryPicker({
  videoId,
  initialCategory,
  categories,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(initialCategory)
  const [syncedCategory, setSyncedCategory] = useState(initialCategory)
  const [newCategory, setNewCategory] = useState('')
  const [, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  if (initialCategory !== syncedCategory) {
    setSyncedCategory(initialCategory)
    setSelected(initialCategory)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function selectCategory(category: string) {
    setIsOpen(false)
    setNewCategory('')

    if (category === selected) {
      return
    }

    const previous = selected
    setSelected(category)

    startTransition(async () => {
      try {
        await updateVideoCategory(videoId, category)
      } catch {
        setSelected(previous)
      }
    })
  }

  function handleCreate() {
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

    setIsOpen(false)
    setNewCategory('')
    const previous = selected
    setSelected(trimmed)

    startTransition(async () => {
      try {
        await createCategoryAndAssignToVideo(videoId, trimmed)
      } catch {
        setSelected(previous)
      }
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {selected}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <ul className="max-h-60 space-y-0.5 overflow-y-auto">
            {categories.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={`block w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                    category === selected
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-center gap-1.5 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <input
              type="text"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleCreate()
                }
              }}
              placeholder="New category"
              className="h-9 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
