'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function markVideoAsRead(formData: FormData) {
  const id = getVideoId(formData)
  await updateVideo(id, { read: true })
}

export async function archiveVideo(formData: FormData) {
  const id = getVideoId(formData)
  await updateVideo(id, { archived: true })
}

async function updateVideo(
  id: number,
  values: { read?: boolean; archived?: boolean }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('YouTube-Summary')
    .update(values)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

function getVideoId(formData: FormData) {
  const id = Number(formData.get('id'))

  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Invalid video id')
  }

  return id
}
