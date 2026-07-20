'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { archiveVideo, updateVideoCategory } from './actions'
import type { CategoryNavItem } from './layout'
import { VIDEO_DRAG_MIME_TYPE } from './video-drag'

type SidebarContentProps = {
  categories: CategoryNavItem[]
  allCount: number
  uncategorizedCount: number
  userEmail: string | null
  activeCategory: string | null
  isArchivedActive: boolean
  onNavigate?: () => void
  showCloseButton?: boolean
  onClose?: () => void
  showCollapseButton?: boolean
  onCollapse?: () => void
  onSignOut: () => void
}

export default function SidebarContent({
  categories,
  allCount,
  uncategorizedCount,
  userEmail,
  activeCategory,
  isArchivedActive,
  onNavigate,
  showCloseButton = false,
  onClose,
  showCollapseButton = false,
  onCollapse,
  onSignOut,
}: SidebarContentProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const isAllActive = !isArchivedActive && activeCategory === 'all'
  const isUncategorizedActive = !isArchivedActive && activeCategory === null

  function handleDropCategory(videoId: number, category: string) {
    startTransition(async () => {
      await updateVideoCategory(videoId, category)
      router.refresh()
    })
  }

  function handleDropArchive(videoId: number) {
    startTransition(async () => {
      await archiveVideo(videoId)
      router.refresh()
    })
  }

  return (
    <div className="flex h-full flex-col font-ui">
      <div className="flex items-center justify-between gap-2 border-b border-qw-border px-5 py-[22px]">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-dark.png"
            alt=""
            width={28}
            height={28}
            className="size-7 object-contain"
          />
          <div>
            <div className="font-display text-sm leading-tight font-semibold text-qw-fg-1">
              Video Summaries
            </div>
            <div className="mt-0.5 text-[9px] font-bold tracking-[0.2em] text-qw-muted-3 uppercase">
              QuietWizard Codex
            </div>
          </div>
        </div>
        {showCollapseButton && (
          <button
            type="button"
            aria-label="Hide navigation menu"
            onClick={onCollapse}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 text-qw-muted-1 transition-colors hover:text-qw-fg-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <polyline points="14 9 11 12 14 15" />
            </svg>
          </button>
        )}
        {showCloseButton && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 text-qw-muted-1 transition-colors hover:text-qw-fg-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        <NavLink
          href="/"
          active={isUncategorizedActive}
          count={uncategorizedCount}
          onNavigate={onNavigate}
          onDropVideo={(videoId) => handleDropCategory(videoId, 'None')}
          icon={<FolderIcon />}
        >
          New
        </NavLink>

        {categories.map((category) => (
          <NavLink
            key={category.label}
            href={`/?category=${encodeURIComponent(category.label)}`}
            active={!isArchivedActive && activeCategory === category.label}
            count={category.count}
            onNavigate={onNavigate}
            onDropVideo={(videoId) => handleDropCategory(videoId, category.label)}
            icon={<FolderIcon />}
          >
            {category.label}
          </NavLink>
        ))}

        <NavLink
          href="/?category=all"
          active={isAllActive}
          count={allCount}
          onNavigate={onNavigate}
          icon={<GridIcon />}
        >
          All Videos
        </NavLink>
      </nav>

      <div className="border-t border-qw-border p-3">
        <NavLink
          href="/?archived=true"
          active={isArchivedActive}
          onNavigate={onNavigate}
          onDropVideo={handleDropArchive}
          icon={<ArchiveIcon />}
        >
          Archived
        </NavLink>
      </div>

      <div className="border-t border-qw-border px-5 py-4">
        <div className="mb-1.5 truncate text-[11px] text-qw-muted-2">
          {userEmail}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-xs text-qw-muted-3 transition-colors hover:text-red-400"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

function NavLink({
  href,
  active,
  count,
  onNavigate,
  icon,
  children,
  onDropVideo,
}: {
  href: string
  active: boolean
  count?: number
  onNavigate?: () => void
  icon: ReactNode
  children: ReactNode
  onDropVideo?: (videoId: number) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isDroppable = onDropVideo !== undefined

  function handleDragOver(event: DragEvent<HTMLAnchorElement>) {
    if (!isDroppable) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDragEnter(event: DragEvent<HTMLAnchorElement>) {
    if (!isDroppable) {
      return
    }
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDrop(event: DragEvent<HTMLAnchorElement>) {
    if (!isDroppable) {
      return
    }
    event.preventDefault()
    setIsDragOver(false)
    const videoId = Number(event.dataTransfer.getData(VIDEO_DRAG_MIME_TYPE))
    if (Number.isInteger(videoId) && videoId > 0) {
      onDropVideo(videoId)
    }
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex items-center justify-between gap-2.5 rounded-md px-3 py-[9px] text-[13px] font-medium transition-colors duration-200 ${
        isDragOver
          ? 'bg-qw-surface-2 text-qw-fg-1 ring-2 ring-qw-accent'
          : active
            ? 'bg-qw-surface-2 text-qw-fg-1'
            : 'text-qw-muted-1 hover:bg-qw-surface-1 hover:text-qw-fg-2'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{children}</span>
      </span>
      {count !== undefined && (
        <span className="shrink-0 text-[11px] text-qw-muted-2">{count}</span>
      )}
    </Link>
  )
}

function GridIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h6l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}
