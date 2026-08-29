import { createAdminClient } from '@/utils/supabase/admin'
import type { Video } from '@/types/database'

export type VideoDetail = Pick<
  Video,
  | 'id'
  | 'videoId'
  | 'title'
  | 'thumbnail'
  | 'videoChannelId'
  | 'videoChannelTitle'
  | 'summary'
  | 'article'
  | 'videoPublished'
  | 'category'
  | 'read'
>

const FIELDS =
  'id, videoId, title, thumbnail, videoChannelId, videoChannelTitle, summary, article, videoPublished, category, read'

// Shared between video/[id]/page.tsx (article summary) and
// video/[id]/article/page.tsx (full article) — both need the same row,
// just render a different field from it.
export async function getVideoByUrlId(id: string): Promise<VideoDetail | null> {
  const supabase = await createAdminClient()

  const { data: videoByVideoId, error: videoIdError } = await supabase
    .from('yts_info')
    .select(FIELDS)
    .eq('videoId', id)
    .maybeSingle<VideoDetail>()

  if (videoIdError) {
    throw new Error(videoIdError.message)
  }

  if (videoByVideoId) {
    return videoByVideoId
  }

  const rowId = Number(id)

  if (!Number.isInteger(rowId) || rowId < 1) {
    return null
  }

  const { data: videoByRowId, error: rowIdError } = await supabase
    .from('yts_info')
    .select(FIELDS)
    .eq('id', rowId)
    .maybeSingle<VideoDetail>()

  if (rowIdError) {
    throw new Error(rowIdError.message)
  }

  return videoByRowId
}

export function isSafeRedirectTarget(target: string | undefined): target is string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
}
