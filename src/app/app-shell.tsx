'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import SidebarContent from './sidebar-content'
import PullToRefresh from './pull-to-refresh'
import OfflineIndicator from './offline-indicator'
import LocalArticleHost from './local-article-host'
import { VideoSyncProvider } from './video-sync-context'
import { LocalVideosProvider } from './local-videos-context'
import { ToastProvider } from '@/components/ui/toast-provider'
import type { CategoryNavItem } from './layout'
import { NAV_COLLAPSED_COOKIE } from './nav-cookie'

const supabase = createClient()

const NAV_COLLAPSED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type AppShellProps = {
  categories: CategoryNavItem[]
  allCount: number
  uncategorizedCount: number
  userEmail: string | null
  initialNavCollapsed: boolean
  children: ReactNode
}

export default function AppShell({
  categories,
  allCount,
  uncategorizedCount,
  userEmail,
  initialNavCollapsed,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNavCollapsed, setIsNavCollapsed] = useState(initialNavCollapsed)
  const shouldShowShell =
    pathname !== '/login' &&
    pathname !== '/offline' &&
    !pathname.startsWith('/auth/callback')

  const toggleNavCollapsed = () => {
    setIsNavCollapsed((prev) => {
      const next = !prev
      document.cookie = `${NAV_COLLAPSED_COOKIE}=${next}; path=/; max-age=${NAV_COLLAPSED_COOKIE_MAX_AGE}; SameSite=Lax`
      return next
    })
  }

  const { activeCategory, isArchivedActive } = resolveActiveContext(
    pathname,
    searchParams
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsMobileMenuOpen(false)
    router.push('/login')
  }

  if (!shouldShowShell) {
    return children
  }

  return (
    <ToastProvider>
      <VideoSyncProvider
        initialCategories={categories}
        initialAllCount={allCount}
        initialUncategorizedCount={uncategorizedCount}
      >
        <LocalVideosProvider>
          <AppShellContent
            userEmail={userEmail}
            activeCategory={activeCategory}
            isArchivedActive={isArchivedActive}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isNavCollapsed={isNavCollapsed}
            toggleNavCollapsed={toggleNavCollapsed}
            handleSignOut={handleSignOut}
          >
            {children}
          </AppShellContent>
        </LocalVideosProvider>
      </VideoSyncProvider>
    </ToastProvider>
  )
}

function AppShellContent({
  userEmail,
  activeCategory,
  isArchivedActive,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isNavCollapsed,
  toggleNavCollapsed,
  handleSignOut,
  children,
}: {
  userEmail: string | null
  activeCategory: string | null
  isArchivedActive: boolean
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  isNavCollapsed: boolean
  toggleNavCollapsed: () => void
  handleSignOut: () => void
  children: ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-qw-bg font-ui">
      <OfflineIndicator />
      <LocalArticleHost />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-qw-border bg-qw-bg/85 px-4 py-3 backdrop-blur-lg md:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 text-qw-muted-1"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Image
            src="/logo-dark.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 object-contain"
          />
          <div className="truncate font-display text-[15px] font-semibold text-qw-fg-1">
            Video Summaries
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-qw-bg/60 animate-[qws-fade-in_200ms_ease-out]"
          />
          <aside className="absolute top-0 left-0 flex h-full w-[280px] max-w-[86vw] flex-col border-r border-qw-border bg-qw-sidebar animate-[qws-fade-in_250ms_var(--ease-qw)]">
            <SidebarContent
              userEmail={userEmail}
              activeCategory={activeCategory}
              isArchivedActive={isArchivedActive}
              onNavigate={() => setIsMobileMenuOpen(false)}
              showCloseButton
              onClose={() => setIsMobileMenuOpen(false)}
              onSignOut={handleSignOut}
            />
          </aside>
        </div>
      )}

      {/* Desktop / tablet sidebar */}
      {!isNavCollapsed && (
        <aside className="fixed top-0 left-0 z-20 hidden h-screen w-[264px] flex-col border-r border-qw-border bg-qw-sidebar md:flex">
          <SidebarContent
            userEmail={userEmail}
            activeCategory={activeCategory}
            isArchivedActive={isArchivedActive}
            onSignOut={handleSignOut}
            showCollapseButton
            onCollapse={toggleNavCollapsed}
          />
        </aside>
      )}

      {/* Collapsed nav toggle (tablet / desktop only) */}
      {isNavCollapsed && (
        <button
          type="button"
          aria-label="Show navigation menu"
          onClick={toggleNavCollapsed}
          className="fixed top-4 left-4 z-20 hidden size-10 items-center justify-center rounded-md border border-qw-border bg-qw-surface-1 text-qw-muted-1 transition-colors hover:text-qw-fg-2 md:flex"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      <main className={`min-w-0 ${isNavCollapsed ? '' : 'md:ml-[264px]'}`}>
        <PullToRefresh>{children}</PullToRefresh>
      </main>
    </div>
  )
}

function resolveActiveContext(
  pathname: string,
  searchParams: URLSearchParams
): { activeCategory: string | null; isArchivedActive: boolean } {
  let params = searchParams

  if (pathname !== '/') {
    const from = searchParams.get('from')
    params = new URLSearchParams()

    if (from) {
      try {
        params = new URL(from, 'http://localhost').searchParams
      } catch {
        // ignore malformed `from` values, fall back to empty params
      }
    }
  }

  const isArchivedActive = params.get('archived') === 'true'
  const rawCategory = params.get('category')?.trim() || null

  return {
    activeCategory: isArchivedActive ? null : rawCategory,
    isArchivedActive,
  }
}
