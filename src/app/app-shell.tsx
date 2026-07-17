'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import SidebarContent from './sidebar-content'
import type { CategoryNavItem } from './layout'

const supabase = createClient()

type AppShellProps = {
  categories: CategoryNavItem[]
  allCount: number
  uncategorizedCount: number
  userEmail: string | null
  children: ReactNode
}

export default function AppShell({
  categories,
  allCount,
  uncategorizedCount,
  userEmail,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const shouldShowShell =
    pathname !== '/login' && !pathname.startsWith('/auth/callback')

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
    <div className="relative min-h-screen bg-qw-bg font-ui">
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
              categories={categories}
              allCount={allCount}
              uncategorizedCount={uncategorizedCount}
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
      <aside className="fixed top-0 left-0 z-20 hidden h-screen w-[264px] flex-col border-r border-qw-border bg-qw-sidebar md:flex">
        <SidebarContent
          categories={categories}
          allCount={allCount}
          uncategorizedCount={uncategorizedCount}
          userEmail={userEmail}
          activeCategory={activeCategory}
          isArchivedActive={isArchivedActive}
          onSignOut={handleSignOut}
        />
      </aside>

      <main className="min-w-0 md:ml-[264px]">{children}</main>
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
