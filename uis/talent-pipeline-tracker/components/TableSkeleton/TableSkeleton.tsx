export default function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-zinc-200"
              style={{
                width: i === 1 ? 160 : i === 2 ? 140 : i === 3 || i === 4 ? 80 : 60,
              }}
            />
          ))}
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-zinc-100 px-4 py-3"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-4 w-36 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-48 animate-pulse rounded bg-zinc-50" />
          </div>
          <div className="h-4 w-28 flex-1 animate-pulse rounded bg-zinc-100" />
          <div className="h-5 w-16 flex-1 animate-pulse rounded-full bg-zinc-100" />
          <div className="h-5 w-20 flex-1 animate-pulse rounded-full bg-zinc-100" />
          <div className="h-4 w-10 flex-1 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-16 flex-1 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-6 flex-1 animate-pulse rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}