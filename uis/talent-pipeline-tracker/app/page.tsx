import Link from "next/link";
import { Suspense } from "react";
import { fetchCandidates } from "@/lib/api";
import CandidateFilters from "@/components/CandidateFilters";
import CandidatesTable from "@/components/CandidatesTable";
import TableSkeleton from "@/components/TableSkeleton";
import PageHeader from "@/components/PageHeader";
import {
  isCandidateStatus,
  isCandidateStage,
} from "@/lib/candidate-meta";
import type {
  Candidate,
  CandidateStage,
  CandidateStatus,
} from "@/lib/types";

interface HomeProps {
  searchParams: Promise<{ search?: string; status?: string | string[]; stage?: string | string[] }>;
}

async function CandidatesList({
  searchParams,
}: {
  searchParams: HomeProps["searchParams"];
}) {
  const sp = await searchParams;

  const search = sp.search ?? "";
  const statusesRaw = sp.status;
  const stagesRaw = sp.stage;

  const statuses: CandidateStatus[] | undefined = statusesRaw
    ? (Array.isArray(statusesRaw) ? statusesRaw : [statusesRaw]).filter(
        isCandidateStatus,
      )
    : undefined;

  const stages: CandidateStage[] | undefined = stagesRaw
    ? (Array.isArray(stagesRaw) ? stagesRaw : [stagesRaw]).filter(
        isCandidateStage,
      )
    : undefined;

  try {
    const res = await fetchCandidates({
      page: 1,
      limit: 100,
      search: search || undefined,
      statuses: statuses?.length ? statuses : undefined,
      stages: stages?.length ? stages : undefined,
    });

    if (res.data.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500">
          No candidates yet.
        </div>
      );
    }

    return <CandidatesTable candidates={res.data} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load candidates.";
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {message}
      </div>
    );
  }
}

export default async function Home({ searchParams }: HomeProps) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader
        title="Candidates"
        description="Pipeline tracker"
        actions={
          <Link
            href="/candidates/new"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            New
          </Link>
        }
      />

      {/* Filters section */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <CandidateFilters />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CandidatesList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
