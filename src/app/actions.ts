'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

// These four are the hot path (tap, expect it to just happen). They're
// already fully covered by client-side optimistic state — videos-client.tsx
// and action-bar.tsx update the UI and roll it back on failure without ever
// needing a re-fetch. `revalidatePath` from a Server Function currently
// purges Next's *entire* client router cache, not just the given path (see
// the "Server Functions" note under revalidatePath's docs), so calling it
// here would force every previously visited route — including the root
// layout's nav-count queries — to refetch from Supabase on its next visit.
// That round trip is exactly the multi-second "nothing happening" delay this
// app was built to get rid of, so these mutations intentionally rely on
// Next's normal cache staleness window to pick up the change instead.
export async function markVideoAsRead(id: number) {
  await updateVideo(id, { read: true })
}

export async function markVideoAsUnread(id: number) {
  await updateVideo(id, { read: false })
}

export async function archiveVideo(id: number) {
  await updateVideo(id, { archived: true, read: true })
}

export async function unarchiveVideo(id: number) {
  await updateVideo(id, { archived: false })
}

export async function updateVideoCategory(videoId: number, category: string) {
  await updateVideo(videoId, { category })
}

export async function createCategoryAndAssignToVideo(
  videoId: number,
  category: string
) {
  const trimmed = category.trim()

  if (!trimmed) {
    throw new Error('Category cannot be empty')
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data) {
    throw new Error('Unauthorized')
  }

  const adminClient = await createAdminClient()

  const { error: insertError } = await adminClient
    .from('yts_categories')
    .insert({ category: trimmed })

  if (insertError) {
    throw new Error(insertError.message)
  }

  const { error: updateError } = await adminClient
    .from('yts_info')
    .update({ category: trimmed })
    .eq('id', videoId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/')
  revalidatePath('/video/[id]', 'page')
}

async function updateVideo(
  id: number,
  values: { read?: boolean; archived?: boolean; category?: string }
) {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Invalid video id')
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data) {
    throw new Error('Unauthorized')
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('yts_info')
    .update(values)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
