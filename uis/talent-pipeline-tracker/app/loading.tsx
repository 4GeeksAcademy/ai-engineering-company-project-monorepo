export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-800" />
      <div className="mb-4 h-10 animate-pulse rounded-xl bg-slate-800" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-800/60" />
        ))}
      </div>
    </div>
  );
}
