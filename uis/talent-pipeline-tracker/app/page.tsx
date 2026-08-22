"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCandidates } from "@/hooks/useCandidates";
import { api } from "@/lib/api";
import { CandidateInput } from "@/types/candidate";
import CandidateTable from "@/components/CandidateTable";
import FilterBar from "@/components/FilterBar";
import SearchBar from "@/components/SearchBar";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import CandidateFormModal from "@/components/CandidateFormModal";

function CandidateListContent() {
  const { candidates, state, error, refresh } = useCandidates();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const status = searchParams.get("status") ?? "";
  const stage = searchParams.get("stage") ?? "";

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (status && c.status !== status) return false;
      if (stage && c.stage !== stage) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [candidates, status, stage, search]);

  async function handleCreate(data: CandidateInput) {
    await api.createCandidate(data);
    await refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Executive Assistant Candidates — Austin HQ</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
        >
          + Register Referral
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <FilterBar />
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {state === "loading" && <LoadingState label="Loading candidates..." />}
      {state === "error" && <ErrorState message={error ?? "Unknown error"} onRetry={refresh} />}
      {state === "success" && <CandidateTable candidates={filtered} />}

      {showAddForm && (
        <CandidateFormModal
          mode="create"
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

export default function CandidateListPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading candidates..." />}>
      <CandidateListContent />
    </Suspense>
  );
}
