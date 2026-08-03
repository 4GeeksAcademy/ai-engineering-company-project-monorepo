"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CandidateFilters } from "@/components/CandidateFilters";
import { CandidateForm } from "@/components/CandidateForm";
import { CandidateTable } from "@/components/CandidateTable";
import { createRecord, getAllRecords } from "@/services/records";
import { CandidateInput, CandidateRecord } from "@/types/records";

export function CandidateListPage() {
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const stage = searchParams.get("stage") ?? "";

  useEffect(() => {
    let ignore = false;

    async function loadRecords() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getAllRecords();

        if (!ignore) {
          setRecords(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError instanceof Error ? requestError.message : "Could not load candidates.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      ignore = true;
    };
  }, []);

  function updateParams(nextValues: { q?: string; status?: string; stage?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    const merged = {
      q: nextValues.q ?? search,
      status: nextValues.status ?? status,
      stage: nextValues.stage ?? stage,
    };

    Object.entries(merged).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        record.full_name.toLowerCase().includes(normalizedSearch) ||
        record.email.toLowerCase().includes(normalizedSearch);

      const matchesStatus = !status || record.status === status;
      const matchesStage = !stage || record.stage === stage;

      return matchesSearch && matchesStatus && matchesStage;
    });
  }, [records, search, status, stage]);

  async function handleCreateCandidate(payload: CandidateInput) {
    const createdRecord = await createRecord(payload);
    setRecords((previous) => [createdRecord, ...previous]);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 md:px-6">
      <header className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-700">TrackFlow People and Talent</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Executive Assistant Pipeline Tracker</h1>
        <p className="mt-1 text-sm text-slate-700">Zaragoza headquarters candidate operations dashboard.</p>
      </header>

      <CandidateFilters
        search={search}
        status={status}
        stage={stage}
        onSearchChange={(value) => updateParams({ q: value })}
        onStatusChange={(value) => updateParams({ status: value })}
        onStageChange={(value) => updateParams({ stage: value })}
      />

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading candidates...</div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 rounded-md border border-red-300 px-3 py-1.5 hover:bg-red-100"
            onClick={() => {
              setIsLoading(true);
              setError(null);
              getAllRecords()
                .then((data) => setRecords(data))
                .catch((requestError) => {
                  setError(requestError instanceof Error ? requestError.message : "Could not load candidates.");
                })
                .finally(() => setIsLoading(false));
            }}
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && <CandidateTable records={filteredRecords} />}

      <CandidateForm mode="create" submitLabel="Register candidate" onSubmit={handleCreateCandidate} />
    </main>
  );
}
