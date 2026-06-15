import { redirect } from 'next/navigation'
import VideosClient from './videos-client'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import type { Video } from '@/types/database'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const selectedCategory = category?.trim() || 'None'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('YouTube-Summary')
    .select('*')
    .or('archived.is.null,archived.eq.false')
    .order('created_at', { ascending: false })

  return (
    <VideosClient
      videos={(data ?? []) as Video[]}
      error={error?.message ?? null}
      selectedCategory={selectedCategory}
    />
  )
}
