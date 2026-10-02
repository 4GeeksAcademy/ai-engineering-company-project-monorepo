import TableSkeleton from "@/components/TableSkeleton";
import FiltersSkeleton from "@/components/FiltersSkeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="h-7 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      <div className="mb-6">
        <FiltersSkeleton />
      </div>

      <TableSkeleton />
    </main>
  );
}