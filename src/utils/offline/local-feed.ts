import type { OfflineVideo } from './db'
import type { VideoListItem } from '@/app/page'
import { isVisibleInView } from '@/utils/video-view-filter'
import type { VideoView } from '@/utils/video-view-filter'

// The client-side equivalent of the `yts_info` query in src/app/page.tsx,
// run against the local IndexedDB cache instead of Supabase. Only ever
// called for non-archived views — archived videos are never synced locally
// (see db.ts), so that view stays server-driven.
export function computeLocalFeed(
  videos: OfflineVideo[],
  view: VideoView,
  searchTerm: string | null
): VideoListItem[] {
  const term = searchTerm?.trim().toLowerCase() || null

  const filtered = videos.filter((video) => {
    if (!isVisibleInView(toVideoListItem(video), view)) {
      return false
    }
    if (term && !matchesSearch(video, term)) {
      return false
    }
    return true
  })

  filtered.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  return filtered.map(toVideoListItem)
}

function matchesSearch(video: OfflineVideo, term: string): boolean {
  return (
    Boolean(video.title?.toLowerCase().includes(term)) ||
    Boolean(video.videoChannelTitle?.toLowerCase().includes(term)) ||
    Boolean(video.summary?.toLowerCase().includes(term)) ||
    Boolean(video.article?.toLowerCase().includes(term))
  )
}

export function toVideoListItem(video: OfflineVideo): VideoListItem {
  return {
    id: video.id,
    videoId: video.videoId,
    title: video.title,
    thumbnail: video.thumbnail,
    videoChannelTitle: video.videoChannelTitle,
    videoPublished: video.videoPublished,
    category: video.category,
    read: video.read,
    archived: video.archived ?? false,
  }
}
