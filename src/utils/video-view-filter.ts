import type { VideoListItem } from '@/app/page'

// Mirrors the UNCATEGORIZED sentinel and query branches built in src/app/page.tsx
// so a locally-applied optimistic change stays consistent with what the server
// would actually return for the current view.
const UNCATEGORIZED = 'None'

export type VideoView = {
  showArchived: boolean
  showAll: boolean
  selectedCategory: string | null
}

type VisibilityItem = Pick<VideoListItem, 'archived' | 'category'>

function normalizeCategory(category: string | null | undefined) {
  return category?.trim() || UNCATEGORIZED
}

export function isVisibleInView(item: VisibilityItem, view: VideoView): boolean {
  const isArchived = item.archived === true

  if (view.showArchived) {
    return isArchived
  }

  if (isArchived) {
    return false
  }

  if (view.showAll) {
    return true
  }

  const category = normalizeCategory(item.category)
  const selectedCategory = view.selectedCategory ?? UNCATEGORIZED

  if (selectedCategory === UNCATEGORIZED) {
    return category === UNCATEGORIZED
  }

  return category === selectedCategory
}

export type NavCountsAdjustment = {
  allCountDelta?: number
  uncategorizedDelta?: number
  categoryDeltas?: Record<string, number>
}

export function computeNavCountsAdjustment(
  before: VisibilityItem,
  after: VisibilityItem
): NavCountsAdjustment {
  const wasArchived = before.archived === true
  const isArchived = after.archived === true

  if (wasArchived && isArchived) {
    return {}
  }

  if (!wasArchived && isArchived) {
    return applyCategoryDelta(normalizeCategory(before.category), -1, {
      allCountDelta: -1,
    })
  }

  if (wasArchived && !isArchived) {
    return applyCategoryDelta(normalizeCategory(after.category), 1, {
      allCountDelta: 1,
    })
  }

  const beforeCategory = normalizeCategory(before.category)
  const afterCategory = normalizeCategory(after.category)

  if (beforeCategory === afterCategory) {
    return {}
  }

  return applyCategoryDelta(
    afterCategory,
    1,
    applyCategoryDelta(beforeCategory, -1, {})
  )
}

export function sumAdjustments(
  a: NavCountsAdjustment,
  b: NavCountsAdjustment
): NavCountsAdjustment {
  const result: NavCountsAdjustment = {}

  const allCountDelta = (a.allCountDelta ?? 0) + (b.allCountDelta ?? 0)
  if (allCountDelta) {
    result.allCountDelta = allCountDelta
  }

  const uncategorizedDelta = (a.uncategorizedDelta ?? 0) + (b.uncategorizedDelta ?? 0)
  if (uncategorizedDelta) {
    result.uncategorizedDelta = uncategorizedDelta
  }

  const categoryDeltas: Record<string, number> = { ...a.categoryDeltas }
  for (const [label, delta] of Object.entries(b.categoryDeltas ?? {})) {
    categoryDeltas[label] = (categoryDeltas[label] ?? 0) + delta
  }
  const nonZeroCategoryDeltas = Object.fromEntries(
    Object.entries(categoryDeltas).filter(([, delta]) => delta !== 0)
  )
  if (Object.keys(nonZeroCategoryDeltas).length > 0) {
    result.categoryDeltas = nonZeroCategoryDeltas
  }

  return result
}

export function negateAdjustment(
  adjustment: NavCountsAdjustment
): NavCountsAdjustment {
  return {
    allCountDelta: adjustment.allCountDelta ? -adjustment.allCountDelta : undefined,
    uncategorizedDelta: adjustment.uncategorizedDelta
      ? -adjustment.uncategorizedDelta
      : undefined,
    categoryDeltas: adjustment.categoryDeltas
      ? Object.fromEntries(
          Object.entries(adjustment.categoryDeltas).map(([label, delta]) => [
            label,
            -delta,
          ])
        )
      : undefined,
  }
}

function applyCategoryDelta(
  category: string,
  delta: number,
  adjustment: NavCountsAdjustment
): NavCountsAdjustment {
  if (category === UNCATEGORIZED) {
    return {
      ...adjustment,
      uncategorizedDelta: (adjustment.uncategorizedDelta ?? 0) + delta,
    }
  }

  return {
    ...adjustment,
    categoryDeltas: {
      ...adjustment.categoryDeltas,
      [category]: (adjustment.categoryDeltas?.[category] ?? 0) + delta,
    },
  }
}
