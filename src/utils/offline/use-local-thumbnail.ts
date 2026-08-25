'use client'

import { useEffect, useState } from 'react'
import { getThumbnail } from './db'

// Once a video's thumbnail has been downloaded (see sync-thumbnails.ts),
// prefer that local copy everywhere it's shown — even while online — so a
// video going private or being deleted on YouTube never breaks its
// artwork. Returns null until a local copy is found, so callers should
// render their normal remote-URL image as the fallback in the meantime.
export function useLocalThumbnail(id: number | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (id == null) {
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    getThumbnail(id).then((blob) => {
      if (cancelled || !blob) {
        return
      }
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [id])

  return url
}
