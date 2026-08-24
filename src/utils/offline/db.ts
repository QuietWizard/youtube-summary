import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'video-summaries-offline'
const DB_VERSION = 1
const STORE_VIDEOS = 'videos'
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
      upgrade(db) {
        const videoStore = db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' })
        videoStore.createIndex('videoId', 'videoId')
        db.createObjectStore(STORE_META)
      },
    })
  }

  return dbPromise
}

export async function replaceAllVideos(videos: OfflineVideo[]) {
  const db = await getDb()
  if (!db) return

  const tx = db.transaction([STORE_VIDEOS, STORE_META], 'readwrite')
  const videoStore = tx.objectStore(STORE_VIDEOS)

  await Promise.all([
    videoStore.clear(),
    ...videos.map((video) => videoStore.put(video)),
    tx.objectStore(STORE_META).put(Date.now(), SYNCED_AT_KEY),
    tx.done,
  ])
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
