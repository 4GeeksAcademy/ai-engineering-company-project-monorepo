"use client";

import Link from "next/link";
import { useState } from "react";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import { createRecord } from "@/lib/api/candidates";
import type { CandidateRecord, CandidateUpsertPayload } from "@/types/candidate";

export default function NewCandidatePage() {
  const [createdCandidate, setCreatedCandidate] = useState<CandidateRecord | null>(null);

  const handleCreateCandidate = async (payload: CandidateUpsertPayload) => {
    return createRecord(payload);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Nexova People and Talent</p>
              <h1 className="mt-2 text-2xl font-semibold">Register New Candidate</h1>
              <p className="mt-1 text-sm text-slate-600">Create a new applicant profile for the active pipeline.</p>
            </div>
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Back to pipeline list
            </Link>
          </div>
        </header>

        <CandidateForm mode="create" onSubmit={handleCreateCandidate} onSuccess={setCreatedCandidate} />

        {createdCandidate ? (
          <section className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Candidate created successfully.
            <div className="mt-2 flex gap-4">
              <Link
                href={`/candidates/${createdCandidate.id}`}
                className="font-medium underline decoration-green-400 underline-offset-2"
              >
                Open candidate profile
              </Link>
              <Link href="/" className="font-medium underline decoration-green-400 underline-offset-2">
                Return to list
              </Link>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
