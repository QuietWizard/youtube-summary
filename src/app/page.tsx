import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import VideosClient from './videos-client'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentUser } from '@/utils/supabase/get-current-user'
import { getCategories } from '@/utils/get-categories'
import type { Video } from '@/types/database'
import { PAGE_SIZE_COOKIE, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from './page-size-cookie'
import { parseFeedView, UNCATEGORIZED } from '@/utils/feed-view'

// Only the columns the video grid/list actually render — `summary` in
// particular can be several KB per row and is only needed on the detail page.
const VIDEO_LIST_FIELDS =
  'id, videoId, title, thumbnail, videoChannelTitle, videoPublished, category, read, archived'

export type VideoListItem = Pick<
  Video,
  | 'id'
  | 'videoId'
  | 'title'
  | 'thumbnail'
  | 'videoChannelTitle'
  | 'videoPublished'
  | 'category'
  | 'read'
  | 'archived'
>

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    page?: string
    archived?: string
    pageSize?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const cookiePageSize = Number(cookieStore.get(PAGE_SIZE_COOKIE)?.value)
  const fallbackPageSize = PAGE_SIZE_OPTIONS.includes(cookiePageSize)
    ? cookiePageSize
    : DEFAULT_PAGE_SIZE

  const {
    showArchived,
    showAll,
    selectedCategory,
    categoryParam,
    page: currentPage,
    pageSize,
    searchTerm,
  } = parseFeedView(params, fallbackPageSize)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from('yts_info')
    .select(VIDEO_LIST_FIELDS, { count: 'exact' })

  query = showArchived
    ? query.eq('archived', true)
    : query.or('archived.is.null,archived.eq.false')

  if (selectedCategory === UNCATEGORIZED) {
    query = query.or('category.is.null,category.eq.,category.eq.None')
  } else if (!showAll && selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  if (searchTerm) {
    // Search title, channel, and summary text server-side so the (potentially
    // large) summary column never needs to be sent to the client just to
    // support search.
    const pattern = toIlikePattern(searchTerm)
    query = query.or(
      `title.ilike.${pattern},videoChannelTitle.ilike.${pattern},summary.ilike.${pattern}`
    )
  }

  const [{ data, error, count }, categories] = await Promise.all([
    query.order('created_at', { ascending: false }).range(from, to),
    getCategories(),
  ])

  const totalCount = count ?? 0

  const viewKey = [
    showArchived,
    showAll,
    selectedCategory ?? '',
    currentPage,
    pageSize,
    searchTerm ?? '',
  ].join('|')

  return (
    <VideosClient
      key={viewKey}
      videos={(data ?? []) as VideoListItem[]}
      error={error?.message ?? null}
      categories={categories}
      selectedCategory={selectedCategory}
      categoryParam={categoryParam}
      showAll={showAll}
      showArchived={showArchived}
      currentPage={currentPage}
      totalCount={totalCount}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      searchTerm={searchTerm}
    />
  )
}

// PostgREST's `ilike` matches `%`/`_` as wildcards and `\` as their escape
// character, so a literal search for e.g. "50%" must escape it first. The
// resulting pattern is then embedded in an `.or(...)` filter string, where
// `,`, `(`, `)`, and `"` are structural characters — if the (already-escaped)
// pattern still contains any of those, it must be double-quoted to be read
// back as a single literal value instead of breaking the filter.
function toIlikePattern(term: string) {
  const escaped = term.replace(/([\\%_])/g, '\\$1')
  const pattern = `%${escaped}%`

  if (/[,()"\\]/.test(pattern)) {
    return `"${pattern.replace(/"/g, '\\"')}"`
  }

  return pattern
}
