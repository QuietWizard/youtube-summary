import { putThumbnail } from './db'
import type { OfflineVideo } from './db'

// YouTube serves a small (~1-2KB) gray placeholder image for
// maxresdefault.jpg — with a 200 response, not a 404 — when a video has no
// high-res thumbnail. Anything this small is that placeholder, not a real
// thumbnail.
const MIN_VALID_THUMBNAIL_BYTES = 2000
const CONCURRENCY = 6

// Downloads and permanently stores the thumbnail for each given video id.
// Run only for ids that don't already have one cached (see syncVideoList in
// db.ts) — thumbnails never change once downloaded, so there's nothing to
// refresh on later syncs.
export async function syncThumbnails(videos: OfflineVideo[], ids: number[]) {
  if (ids.length === 0) return

  const byId = new Map(videos.map((video) => [video.id, video]))
  const queue = ids.filter((id) => byId.has(id))
  let cursor = 0

  async function worker() {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= queue.length) return

      const video = byId.get(queue[index])
      if (video) {
        await downloadOne(video)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)
  )
}

async function downloadOne(video: OfflineVideo) {
  if (!video.videoId) return

  const fallbackUrl = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`
  const candidates =
    video.thumbnail && video.thumbnail !== fallbackUrl
      ? [video.thumbnail, fallbackUrl]
      : [fallbackUrl]

  for (const url of candidates) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue

      const blob = await response.blob()
      if (blob.size < MIN_VALID_THUMBNAIL_BYTES) continue

      await putThumbnail(video.id, blob)
      return
    } catch {
      // Try the next candidate, if any.
    }
  }
}
