import { PAGE_SIZE_OPTIONS } from '@/app/page-size-cookie'

// Shared between the server query in src/app/page.tsx and the local-first
// re-implementation of the same view logic in videos-client.tsx — both must
// agree on exactly what a given URL means, or switching between a real
// navigation and a local one would visibly change what's shown.
export const UNCATEGORIZED = 'None'

export type FeedView = {
  showArchived: boolean
  showAll: boolean
  selectedCategory: string | null
  categoryParam: string | null
  page: number
  pageSize: number
  searchTerm: string | null
}

export type FeedViewParams = {
  category?: string | null
  page?: string | null
  archived?: string | null
  pageSize?: string | null
  search?: string | null
}

export function parseFeedView(
  params: FeedViewParams,
  fallbackPageSize: number
): FeedView {
  const rawCategory = params.category?.trim() || null
  const showArchived = params.archived === 'true'
  const showAll = !showArchived && rawCategory?.toLowerCase() === 'all'
  const selectedCategory =
    !showArchived && !showAll && !rawCategory ? UNCATEGORIZED : rawCategory
  const searchTerm = params.search?.trim() || null
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : fallbackPageSize
  const page = Math.max(1, Number(params.page) || 1)
  const categoryParam = showAll
    ? 'all'
    : selectedCategory && selectedCategory !== UNCATEGORIZED
      ? selectedCategory
      : null

  return {
    showArchived,
    showAll,
    selectedCategory,
    categoryParam,
    page,
    pageSize,
    searchTerm,
  }
}

export function feedViewParamsFromSearchParams(url: URL): FeedViewParams {
  return {
    category: url.searchParams.get('category'),
    page: url.searchParams.get('page'),
    archived: url.searchParams.get('archived'),
    pageSize: url.searchParams.get('pageSize'),
    search: url.searchParams.get('search'),
  }
}
