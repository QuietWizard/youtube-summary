import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'video-summaries-offline'
const DB_VERSION = 2
const STORE_VIDEOS = 'videos'
const STORE_THUMBNAILS = 'thumbnails'
const STORE_META = 'meta'
const SYNCED_AT_KEY = 'syncedAt'

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
    value: number
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
      },
    })
  }

  return dbPromise
}

// Replaces the metadata for the current unarchived set in one atomic
// transaction, and reports which video ids still need a thumbnail
// downloaded (see use-background-sync.ts) and which fell out of the set
// (archived, or deleted — their thumbnail blob is dropped here since that
// part doesn't need a network round trip). Downloading itself can't happen
// inside this transaction: IndexedDB auto-commits a transaction that's left
// idle across an async gap like a fetch.
//
// "Needs a thumbnail" is checked against the thumbnails store directly
// rather than just newly-added video ids — a video whose metadata already
// existed locally before thumbnail downloading shipped (or whose download
// failed last time) still needs one, even though it isn't "new".
export async function syncVideoList(
  videos: OfflineVideo[]
): Promise<{ idsNeedingThumbnail: number[]; removedIds: number[] }> {
  const db = await getDb()
  if (!db) return { idsNeedingThumbnail: [], removedIds: [] }

  const existingIds = new Set(await db.getAllKeys(STORE_VIDEOS))
  const existingThumbnailIds = new Set(await db.getAllKeys(STORE_THUMBNAILS))
  const nextIds = new Set(videos.map((video) => video.id))
  const removedIds = Array.from(existingIds).filter((id) => !nextIds.has(id))
  const idsNeedingThumbnail = videos
    .map((video) => video.id)
    .filter((id) => !existingThumbnailIds.has(id))

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

  return { idsNeedingThumbnail, removedIds }
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
  return db.get(STORE_META, SYNCED_AT_KEY)
}
