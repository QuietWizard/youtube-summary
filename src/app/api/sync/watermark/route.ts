import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentUser } from '@/utils/supabase/get-current-user'

// Cheap "did anything change" check: a single indexed row, not the full
// dataset. Covers the whole table, not just the unarchived set, since an
// archive is itself a change the client needs to notice (to drop that
// video locally) — see the yts_info_set_updated_at trigger.
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('yts_info')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ watermark: data?.updated_at ?? null })
}
