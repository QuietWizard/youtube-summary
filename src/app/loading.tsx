const SKELETON_CARD_COUNT = 12

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-20">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 h-[11px] w-24 animate-pulse rounded bg-qw-surface-2" />
          <div className="mt-1.5 h-4 w-20 animate-pulse rounded bg-qw-surface-2" />
        </div>
        <div className="h-[42px] w-[280px] max-w-full animate-pulse rounded-md bg-qw-surface-1" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-lg border border-qw-border bg-qw-surface-1"
          >
            <div className="aspect-video w-full animate-pulse bg-qw-surface-2" />
            <div className="flex flex-col gap-2.5 p-4">
              <div className="h-3.5 w-[85%] animate-pulse rounded bg-qw-surface-2" />
              <div className="h-3.5 w-[55%] animate-pulse rounded bg-qw-surface-2" />
              <div className="h-3 w-[40%] animate-pulse rounded bg-qw-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
