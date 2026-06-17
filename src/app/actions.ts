'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function markVideoAsRead(formData: FormData) {
  const id = getVideoId(formData)
  await updateVideo(id, { read: true })
  revalidatePath('/')
  revalidatePath('/video/[id]', 'page')
}

export async function archiveVideo(formData: FormData) {
  const id = getVideoId(formData)
  await updateVideo(id, { archived: true, read: true })
  revalidatePath('/')
  redirect('/')
}

export async function updateVideoCategory(videoId: number, category: string) {
  await updateVideo(videoId, { category })
  revalidatePath('/')
  revalidatePath('/video/[id]', 'page')
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const adminClient = await createAdminClient()

  const { error: insertError } = await adminClient
    .from('Categories')
    .insert({ category: trimmed })

  if (insertError) {
    throw new Error(insertError.message)
  }

  const { error: updateError } = await adminClient
    .from('YouTube-Summary')
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('YouTube-Summary')
    .update(values)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

function getVideoId(formData: FormData) {
  const id = Number(formData.get('id'))

  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Invalid video id')
  }

  return id
}
