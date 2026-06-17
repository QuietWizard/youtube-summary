import { redirect } from 'next/navigation'
import VideosClient from './videos-client'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import type { Video } from '@/types/database'

const UNCATEGORIZED = 'None'
const PAGE_SIZE_OPTIONS = [20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    page?: string
    archived?: string
    pageSize?: string
  }>
}) {
  const { category, page, archived, pageSize: pageSizeParam } = await searchParams
  const selectedCategory = category?.trim() || null
  const showArchived = archived === 'true'
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(pageSizeParam))
    ? Number(pageSizeParam)
    : DEFAULT_PAGE_SIZE
  const currentPage = Math.max(1, Number(page) || 1)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from('YouTube-Summary')
    .select('*', { count: 'exact' })

  query = showArchived
    ? query.eq('archived', true)
    : query.or('archived.is.null,archived.eq.false')

  if (selectedCategory === UNCATEGORIZED) {
    query = query.or('category.is.null,category.eq.,category.eq.None')
  } else if (selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <VideosClient
      videos={(data ?? []) as Video[]}
      error={error?.message ?? null}
      selectedCategory={selectedCategory}
      showArchived={showArchived}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
    />
  )
}
