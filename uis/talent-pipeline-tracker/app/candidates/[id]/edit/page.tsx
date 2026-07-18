"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import { getRecordById, replaceRecord } from "@/lib/api/candidates";
import type { CandidateRecord, CandidateUpsertPayload } from "@/types/candidate";

export default function EditCandidatePage() {
  const params = useParams<{ id: string }>();
  const candidateId = params?.id ?? "";

  const [record, setRecord] = useState<CandidateRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    const loadRecord = async () => {
      setLoading(true);
      setError("");

      try {
        const candidate = await getRecordById(candidateId);
        setRecord(candidate);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load candidate for edit.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadRecord();
  }, [candidateId]);

  const handleUpdateCandidate = async (payload: CandidateUpsertPayload) => {
    return replaceRecord(candidateId, payload);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Nexova People and Talent</p>
              <h1 className="mt-2 text-2xl font-semibold">Edit Candidate</h1>
              <p className="mt-1 text-sm text-slate-600">Correct or update candidate data.</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/candidates/${candidateId}`}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to profile
              </Link>
              <Link
                href="/"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Pipeline list
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading candidate data...
          </section>
        ) : null}

        {!loading && error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</section>
        ) : null}

        {!loading && !error && record ? (
          <CandidateForm mode="edit" initialRecord={record} onSubmit={handleUpdateCandidate} onSuccess={setRecord} />
        ) : null}
      </main>
    </div>
  );
}
