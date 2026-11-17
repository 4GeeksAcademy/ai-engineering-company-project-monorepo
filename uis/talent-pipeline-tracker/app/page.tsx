"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useRecordsFilters } from "@/hooks/useRecordsFilters";
import { listCandidates, createCandidate } from "@/lib/api";
import type { Candidate, PaginationParams } from "@/types";
import { CandidateRow } from "@/components/CandidateRow";
import { FilterBar } from "@/components/FilterBar";
import { CandidateForm } from "@/components/CandidateForm";
import { LoadingPage, ErrorBanner, EmptyBanner, SuccessBanner } from "@/components/StatusBanners";

/** Exact status and stage values from the API, with display labels. */
const STATUS_OPTIONS = [
  { value: "received", label: "Received" },
  { value: "in_progress", label: "In progress" },
  { value: "selected", label: "Selected" },
  { value: "discarded", label: "Discarded" },
];

const STAGE_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "review", label: "Under review" },
  { value: "personal_interview", label: "Personal interview" },
  { value: "technical_interview", label: "Technical interview" },
  { value: "offer_presented", label: "Offer presented" },
];

export default function ListPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ListPageContent />
    </Suspense>
  );
}

function ListPageContent() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create candidate
  const [showForm, setShowForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters from URL (server-side filtering)
  const { status, stage, search, setFilters, clearFilters } = useRecordsFilters();

  // Fetch — passes filters to the API which does server-side filtering
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: PaginationParams = {};
      if (status) params.status = status;
      if (stage) params.stage = stage;
      if (search) params.search = search;

      const response = await listCandidates(params);
      setCandidates(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [status, stage, search]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Handle create candidate
  const handleCreate = async (payload: Parameters<typeof createCandidate>[0]) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      await createCandidate(payload);
      setFormSuccess("Candidate created successfully!");
      setShowForm(false);
      await fetchCandidates();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create candidate");
      throw err;
    }
  };

  return (
    <div className="container">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Talent Pipeline</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
            {total} candidate{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Add Candidate
        </button>
      </header>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
            New Candidate
          </h2>
          {formSuccess && <SuccessBanner message={formSuccess} />}
          {formError && <ErrorBanner message={formError} />}
          <CandidateForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            statusOptions={STATUS_OPTIONS}
            stageOptions={STAGE_OPTIONS}
          />
        </div>
      )}

      {/* Filters — sent server-side via API params */}
      <FilterBar
        status={status}
        stage={stage}
        search={search}
        statusOptions={STATUS_OPTIONS}
        stageOptions={STAGE_OPTIONS}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {/* Content */}
      {loading && <LoadingPage />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && candidates.length === 0 && (
        <EmptyBanner
          message={
            status || stage || search
              ? "No candidates match the current filters."
              : "No candidates yet. Add your first candidate!"
          }
        />
      )}
      {!loading && !error && candidates.length > 0 && (
        <div>
          {candidates.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              statusOptions={STATUS_OPTIONS}
              stageOptions={STAGE_OPTIONS}
            />
          ))}
        </div>
      )}
    </div>
  );
}