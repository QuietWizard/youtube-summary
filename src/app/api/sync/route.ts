import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentUser } from '@/utils/supabase/get-current-user'

// Full-refresh sync endpoint for the offline cache: returns every unarchived
// video, summary included, so the client can read them with no connection.
// The unarchived set is small enough (a couple MB at most) that re-pulling
// all of it on every sync is simpler and safer than tracking a watermark of
// what changed — revisit if the library grows enough for that to matter.
const SYNC_FIELDS =
  'id, videoId, title, thumbnail, videoChannelId, videoChannelTitle, summary, read, videoPublished, category'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('yts_info')
    .select(SYNC_FIELDS)
    .or('archived.is.null,archived.eq.false')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videos: data ?? [], syncedAt: Date.now() })
}
