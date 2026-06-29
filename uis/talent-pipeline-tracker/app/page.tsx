"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCandidates } from "@/hooks/useCandidates";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { CandidateList } from "@/components/candidates/CandidateList";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import type { CandidateStatus, CandidateStage } from "@/lib/types";
import { CANDIDATE_STATUS_VALUES, CANDIDATE_STAGE_VALUES } from "@/lib/constants";

function parseStatus(value: string | null): CandidateStatus | undefined {
  if (value && CANDIDATE_STATUS_VALUES.includes(value as CandidateStatus)) {
    return value as CandidateStatus;
  }
  return undefined;
}

function parseStage(value: string | null): CandidateStage | undefined {
  if (value && CANDIDATE_STAGE_VALUES.includes(value as CandidateStage)) {
    return value as CandidateStage;
  }
  return undefined;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);

  const status = parseStatus(searchParams.get("status"));
  const stage = parseStage(searchParams.get("stage"));
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const { candidates, total, page: currentPage, totalPages, loading, error, refetch } =
    useCandidates({ status, stage, search, page, limit: 20 });

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/candidates/${id}?from=/&${searchParams.toString()}`);
    },
    [router, searchParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSaved = useCallback(
    () => {
      refetch();
      setFormOpen(false);
    },
    [refetch],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Talent Tracker</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pipeline de reclutamiento — {total} candidaturas
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex group items-center gap-1 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
          >
          Nueva aplicación
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 -rotate-45 group-hover:rotate-0 group-hover:translate-x-1 group-hover:scale-110 transition">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>

        </button>
      </div>

      <CandidateFilters />

      <div className="mt-4">
        <CandidateList
          candidates={candidates}
          total={total}
          page={currentPage}
          totalPages={totalPages}
          loading={loading}
          error={error}
          onSelect={handleSelect}
          onPageChange={handlePageChange}
          onRetry={refetch}
        />
      </div>

      <CandidateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
