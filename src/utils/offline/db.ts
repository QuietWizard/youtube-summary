import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'video-summaries-offline'
const DB_VERSION = 3
const STORE_VIDEOS = 'videos'
const STORE_THUMBNAILS = 'thumbnails'
const STORE_META = 'meta'
const STORE_MUTATIONS = 'mutations'
const SYNCED_AT_KEY = 'syncedAt'
const WATERMARK_KEY = 'watermark'

export type MutationField = 'read' | 'archived' | 'category'

export type OfflineVideo = {
  id: number
  videoId: string | null
  title: string | null
  thumbnail: string | null
  videoChannelId: string | null
  videoChannelTitle: string | null
  summary: string | null
  read: boolean | null
  videoPublished: string | null
  category: string | null
  // ISO timestamps per field, set server-side by the yts_info_set_updated_at
  // trigger. Used to resolve conflicts when pushing a queued local mutation:
  // see sync-mutations.ts.
  field_updated_at: Partial<Record<MutationField, string>>
}

// One pending, not-yet-pushed local edit. Keyed by `${videoId}:${field}` so
// repeated edits to the same field (e.g. toggling read on and off) coalesce
// into a single queued entry rather than piling up — only the latest value
// and its timestamp matter.
export type PendingMutation = {
  key: string
  videoId: number
  field: MutationField
  value: boolean | string
  // When the user actually made this change, on this device — compared
  // against the server's field_updated_at at push time to decide whether
  // this edit is still current or has been superseded elsewhere.
  createdAt: number
}

interface OfflineDBSchema extends DBSchema {
  [STORE_VIDEOS]: {
    key: number
    value: OfflineVideo
    indexes: { videoId: string }
  }
  // Keyed by the same numeric video id as STORE_VIDEOS. Downloaded once and
  // kept indefinitely — thumbnails don't change, and keeping our own copy
  // means a video's artwork survives even if the source video is later
  // taken down on YouTube, online or off.
  [STORE_THUMBNAILS]: {
    key: number
    value: Blob
  }
  [STORE_META]: {
    key: string
    value: number | string | null
  }
  [STORE_MUTATIONS]: {
    key: string
    value: PendingMutation
    indexes: { videoId: number }
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null

function getDb() {
  if (typeof indexedDB === 'undefined') {
    return null
  }

  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const videoStore = db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' })
          videoStore.createIndex('videoId', 'videoId')
          db.createObjectStore(STORE_META)
        }
        if (oldVersion < 2) {
          db.createObjectStore(STORE_THUMBNAILS)
        }
        if (oldVersion < 3) {
          const mutationStore = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'key' })
          mutationStore.createIndex('videoId', 'videoId')
        }
      },
    })
  }

  return dbPromise
}

// Replaces the metadata for the current unarchived set in one atomic
// transaction, and reports which video ids are new (need a thumbnail
// downloaded — see use-background-sync.ts) and which fell out of the set
// (archived, or deleted — their thumbnail blob is dropped here since that
// part doesn't need a network round trip). Downloading itself can't happen
// inside this transaction: IndexedDB auto-commits a transaction that's left
// idle across an async gap like a fetch.
export async function syncVideoList(
  videos: OfflineVideo[]
): Promise<{ addedIds: number[]; removedIds: number[] }> {
  const db = await getDb()
  if (!db) return { addedIds: [], removedIds: [] }

  const existingIds = new Set(await db.getAllKeys(STORE_VIDEOS))
  const nextIds = new Set(videos.map((video) => video.id))
  const addedIds = videos.map((video) => video.id).filter((id) => !existingIds.has(id))
  const removedIds = Array.from(existingIds).filter((id) => !nextIds.has(id))

  const tx = db.transaction([STORE_VIDEOS, STORE_THUMBNAILS, STORE_META], 'readwrite')
  const videoStore = tx.objectStore(STORE_VIDEOS)
  const thumbnailStore = tx.objectStore(STORE_THUMBNAILS)

  await Promise.all([
    videoStore.clear(),
    ...videos.map((video) => videoStore.put(video)),
    ...removedIds.map((id) => thumbnailStore.delete(id)),
    tx.objectStore(STORE_META).put(Date.now(), SYNCED_AT_KEY),
    tx.done,
  ])

  return { addedIds, removedIds }
}

export async function putThumbnail(id: number, blob: Blob) {
  const db = await getDb()
  if (!db) return
  await db.put(STORE_THUMBNAILS, blob, id)
}

export async function getThumbnail(id: number): Promise<Blob | undefined> {
  const db = await getDb()
  if (!db) return undefined
  return db.get(STORE_THUMBNAILS, id)
}

export async function getAllOfflineVideos(): Promise<OfflineVideo[]> {
  const db = await getDb()
  if (!db) return []
  return db.getAll(STORE_VIDEOS)
}

export async function getOfflineVideoById(id: number): Promise<OfflineVideo | undefined> {
  const db = await getDb()
  if (!db) return undefined
  return db.get(STORE_VIDEOS, id)
}

// Mirrors the lookup order used server-side in video/[id]/page.tsx: the
// route param is usually the YouTube video id, occasionally the row id.
export async function getOfflineVideoByKey(
  key: string
): Promise<OfflineVideo | undefined> {
  const db = await getDb()
  if (!db) return undefined

  const byVideoId = await db.getFromIndex(STORE_VIDEOS, 'videoId', key)
  if (byVideoId) return byVideoId

  const rowId = Number(key)
  if (!Number.isInteger(rowId) || rowId < 1) return undefined
  return db.get(STORE_VIDEOS, rowId)
}

export async function getSyncedAt(): Promise<number | undefined> {
  const db = await getDb()
  if (!db) return undefined
  const value = await db.get(STORE_META, SYNCED_AT_KEY)
  return typeof value === 'number' ? value : undefined
}

export async function getWatermark(): Promise<string | null> {
  const db = await getDb()
  if (!db) return null
  const value = await db.get(STORE_META, WATERMARK_KEY)
  return typeof value === 'string' ? value : null
}

export async function setWatermark(watermark: string | null) {
  const db = await getDb()
  if (!db) return
  await db.put(STORE_META, watermark, WATERMARK_KEY)
}

// --- Pending mutation queue -------------------------------------------

export async function enqueueMutation(
  videoId: number,
  field: MutationField,
  value: boolean | string
) {
  const db = await getDb()
  if (!db) return

  await db.put(STORE_MUTATIONS, {
    key: `${videoId}:${field}`,
    videoId,
    field,
    value,
    createdAt: Date.now(),
  })
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDb()
  if (!db) return []
  return db.getAll(STORE_MUTATIONS)
}

export async function getPendingMutationCount(): Promise<number> {
  const db = await getDb()
  if (!db) return 0
  return db.count(STORE_MUTATIONS)
}

export async function removeMutation(key: string) {
  const db = await getDb()
  if (!db) return
  await db.delete(STORE_MUTATIONS, key)
}
