'use client'

import { useLocalThumbnail } from '@/utils/offline/use-local-thumbnail'

type VideoHeroProps = {
  id: number
  thumbnail: string | null
}

export default function VideoHero({ id, thumbnail }: VideoHeroProps) {
  // Prefer the downloaded copy once one exists — see the note on the
  // thumbnails store in db.ts — falling back to the server-provided remote
  // URL until it's synced.
  const localThumbnail = useLocalThumbnail(id)
  const backgroundImage = localThumbnail ?? thumbnail

  return (
    <section
      className="relative flex min-h-[280px] items-end bg-qw-surface-2 bg-cover bg-center"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#07090F_0%,rgba(7,9,15,0.6)_55%,rgba(7,9,15,0.15)_100%)]" />
    </section>
  )
}
