"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { PaginationControls } from "@/components/candidates/PaginationControls";
import { CandidateTable } from "@/components/candidates/CandidateTable";
import { getRecords } from "@/lib/api/candidates";
import type { CandidateRecord, CandidateStage, CandidateStatus } from "@/types/candidate";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");

  const statusFromQuery = (searchParams.get("status") ?? "") as CandidateStatus | "";
  const stageFromQuery = (searchParams.get("stage") ?? "") as CandidateStage | "";
  const pageFromQueryRaw = Number(searchParams.get("page") ?? "1");
  const pageFromQuery = Number.isNaN(pageFromQueryRaw) || pageFromQueryRaw < 1 ? 1 : pageFromQueryRaw;

  const setPageInQuery = (nextPage: number) => {
    const safePage = Math.max(1, nextPage);
    const params = new URLSearchParams(searchParams.toString());

    if (safePage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(safePage));
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getRecords({
          page: pageFromQuery,
          limit: 20,
          status: statusFromQuery,
          stage: stageFromQuery,
          search: searchTerm,
        });

        setRecords(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);

        if (pageFromQuery > response.totalPages) {
          const params = new URLSearchParams(searchParams.toString());
          if (response.totalPages <= 1) {
            params.delete("page");
          } else {
            params.set("page", String(response.totalPages));
          }

          const queryString = params.toString();
          router.replace(queryString ? `${pathname}?${queryString}` : pathname);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error while loading candidates.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadRecords();
  }, [pageFromQuery, statusFromQuery, stageFromQuery, searchTerm, pathname, router, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (pageFromQuery !== 1) {
      setPageInQuery(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Nexova People and Talent</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Applicant Pipeline Tracker</h1>
              <p className="mt-2 text-sm text-slate-600">
                Executive Assistant hiring campaign dashboard for Valencia HQ.
              </p>
            </div>
            <Link
              href="/candidates/new"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Register candidate
            </Link>
          </div>
        </header>

        <CandidateFilters
          status={statusFromQuery}
          stage={stageFromQuery}
          search={searchTerm}
          onSearchChange={handleSearchChange}
        />

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Showing up to 20 applicants per page. Total applicants: {total}.
        </section>

        {loading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading candidate records...
          </section>
        ) : null}

        {!loading && error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</section>
        ) : null}

        {!loading && !error && records.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No candidates match the current filters.
          </section>
        ) : null}

        {!loading && !error && records.length > 0 ? (
          <CandidateTable candidates={records} />
        ) : null}

        {!loading && !error && records.length > 0 ? (
          <PaginationControls currentPage={pageFromQuery} totalPages={totalPages} onPageChange={setPageInQuery} />
        ) : null}
      </main>
    </div>
  );
}
