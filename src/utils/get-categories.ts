import { cache } from 'react'
import { createAdminClient } from '@/utils/supabase/admin'

export const getCategories = cache(async (): Promise<string[]> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('Categories').select('category')

  if (error) {
    return []
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.category?.trim())
        .filter(
          (category): category is string =>
            Boolean(category && category !== 'None')
        )
    )
  ).sort((a, b) => a.localeCompare(b))
})
