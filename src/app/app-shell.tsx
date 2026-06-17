'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type AppShellProps = {
  categories: string[]
  children: ReactNode
}

export default function AppShell({ categories, children }: AppShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const selectedCategory = searchParams.get('category')
  const isArchivedView = searchParams.get('archived') === 'true'
  const shouldShowShell =
    pathname !== '/login' && !pathname.startsWith('/auth/callback')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMobileMenuOpen(false)
    router.push('/login')
  }

  if (!shouldShowShell) {
    return children
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-[1600px] items-center px-4 py-4">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <span className="flex flex-col gap-1.5" aria-hidden="true">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
          <Link
            href="/"
            className="flex-1 text-center text-xl font-bold text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300 sm:text-2xl"
          >
            Video Summary Articles
          </Link>
          <div className="h-10 w-10 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <MobileMenu
        categories={categories}
        isArchivedView={isArchivedView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        selectedCategory={selectedCategory}
      />

      <div className="mx-auto max-w-[1600px]">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}

function MobileMenu({
  categories,
  isArchivedView,
  isOpen,
  onClose,
  onLogout,
  selectedCategory,
}: {
  categories: string[]
  isArchivedView: boolean
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  selectedCategory: string | null
}) {
  return (
    <div
      className={`fixed inset-0 z-30 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-80 max-w-[86vw] flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Categories
          </h2>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            X
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <CategoryLink
            active={selectedCategory === null && !isArchivedView}
            onNavigate={onClose}
            variant="sidebar"
          >
            All Videos
          </CategoryLink>
          {categories.map((category) => (
            <CategoryLink
              key={category}
              active={selectedCategory === category && !isArchivedView}
              category={category}
              onNavigate={onClose}
              variant="sidebar"
            >
              {category}
            </CategoryLink>
          ))}
        </nav>

        <div className="p-4">
          <Link
            href="/?archived=true"
            onClick={onClose}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              isArchivedView
                ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
          >
            Show Archived Videos
          </Link>
        </div>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 w-full items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  )
}

function CategoryLink({
  active,
  category,
  children,
  onNavigate,
  variant = 'mobile',
}: {
  active: boolean
  category?: string
  children: ReactNode
  onNavigate?: () => void
  variant?: 'mobile' | 'sidebar'
}) {
  const href = category ? `/?category=${encodeURIComponent(category)}` : '/'
  const baseClasses =
    variant === 'sidebar'
      ? 'block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors'
      : 'inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium transition-colors'
  const stateClasses = active
    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`${baseClasses} ${stateClasses}`}
    >
      {children}
    </Link>
  )
}
