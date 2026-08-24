export default function Loading() {
  return (
    <div>
      <div className="min-h-[280px] animate-pulse bg-qw-surface-2" />

      <article className="mx-auto max-w-[880px] px-6 pb-24">
        <div className="sticky top-0 z-10 -mt-7 mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-qw-border bg-qw-bg/90 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="h-[38px] w-[76px] animate-pulse rounded-md border border-qw-border bg-qw-surface-1" />
            <div className="h-[38px] w-[90px] animate-pulse rounded-md border border-qw-border bg-qw-surface-1" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[38px] w-[120px] animate-pulse rounded-md border border-qw-border bg-qw-surface-1" />
            <div className="h-[38px] w-[80px] animate-pulse rounded-md border border-qw-danger/30 bg-qw-danger/[0.08]" />
          </div>
        </div>

        <div className="mb-2.5 h-[13px] w-40 animate-pulse rounded bg-qw-surface-2" />
        <div className="mb-3 h-[34px] w-[85%] animate-pulse rounded bg-qw-surface-2" />
        <div className="mb-7 h-[15px] w-32 animate-pulse rounded bg-qw-surface-2" />

        <hr className="mb-7 border-qw-border" />

        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-4 animate-pulse rounded bg-qw-surface-2"
              style={{ width: `${[95, 88, 92, 70, 90, 60][index]}%` }}
            />
          ))}
        </div>
      </article>
    </div>
  )
}
