export default function FiltersSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-100" />
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-100" />
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-5 w-20 animate-pulse rounded bg-zinc-100"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-100" />
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-5 w-28 animate-pulse rounded bg-zinc-100"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}