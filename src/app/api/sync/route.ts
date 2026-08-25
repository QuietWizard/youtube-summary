import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCurrentUser } from '@/utils/supabase/get-current-user'

// Full-refresh sync endpoint for the local cache: returns every unarchived
// video, summary included. Still a full refresh rather than an incremental
// diff — the unarchived set is small enough (a couple MB at most) that
// re-pulling all of it is simpler than tracking per-row deltas — but now
// gated behind /api/sync/watermark so it's only called at all when
// something has actually changed since the last sync.
//
// field_updated_at is included per row so the client can resolve conflicts
// when pushing its own queued local mutations: a queued change is only
// applied if the field it touches hasn't been changed server-side more
// recently than the local edit's own timestamp.
const SYNC_FIELDS =
  'id, videoId, title, thumbnail, videoChannelId, videoChannelTitle, summary, read, videoPublished, category, created_at, field_updated_at'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const [{ data, error }, watermark] = await Promise.all([
    supabase
      .from('yts_info')
      .select(SYNC_FIELDS)
      .or('archived.is.null,archived.eq.false')
      .order('created_at', { ascending: false }),
    fetchWatermark(supabase),
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videos: data ?? [], watermark })
}

async function fetchWatermark(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase
    .from('yts_info')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.updated_at ?? null
}
