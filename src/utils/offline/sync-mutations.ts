import {
  getOfflineVideoById,
  getPendingMutations,
  removeMutation,
} from './db'
import type { PendingMutation } from './db'
import {
  archiveVideo,
  markVideoAsRead,
  markVideoAsUnread,
  unarchiveVideo,
  updateVideoCategory,
} from '@/app/actions'

// Pushes every queued local edit to the server, oldest first. For each one,
// checks whether that exact field has been changed server-side more
// recently than this device's own edit (using field_updated_at from the
// most recently synced copy of the video — see db.ts and the
// yts_info_set_updated_at trigger). If so, a chronologically later edit
// already happened elsewhere and this stale queued mutation is dropped
// rather than pushed. Stops at the first genuine failure (network, still
// offline) rather than reordering by skipping ahead, and leaves everything
// from that point on queued for the next attempt.
export async function flushMutationQueue(): Promise<void> {
  const pending = await getPendingMutations()
  if (pending.length === 0) {
    return
  }

  const ordered = [...pending].sort((a, b) => a.createdAt - b.createdAt)

  for (const mutation of ordered) {
    const video = await getOfflineVideoById(mutation.videoId)
    const serverFieldUpdatedAt = video?.field_updated_at?.[mutation.field]

    if (
      serverFieldUpdatedAt &&
      new Date(serverFieldUpdatedAt).getTime() > mutation.createdAt
    ) {
      await removeMutation(mutation.key)
      continue
    }

    try {
      await pushMutation(mutation)
      await removeMutation(mutation.key)
    } catch {
      break
    }
  }
}

async function pushMutation(mutation: PendingMutation) {
  switch (mutation.field) {
    case 'archived':
      return mutation.value ? archiveVideo(mutation.videoId) : unarchiveVideo(mutation.videoId)
    case 'read':
      return mutation.value
        ? markVideoAsRead(mutation.videoId)
        : markVideoAsUnread(mutation.videoId)
    case 'category':
      return updateVideoCategory(mutation.videoId, String(mutation.value))
  }
}
