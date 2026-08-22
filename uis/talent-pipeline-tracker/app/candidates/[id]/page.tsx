"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCandidate } from "@/hooks/useCandidate";
import { api } from "@/lib/api";
import { CandidateInput } from "@/types/candidate";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import StatusStageEditor from "@/components/StatusStageEditor";
import NotesPanel from "@/components/NotesPanel";
import CandidateFormModal from "@/components/CandidateFormModal";

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { candidate, notes, state, error, refresh, setCandidate, setNotes } = useCandidate(id);
  const [showEditForm, setShowEditForm] = useState(false);

  async function handleEdit(data: CandidateInput) {
    const updated = await api.updateCandidate(id, data);
    setCandidate(updated);
  }

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-brand hover:underline">
        &larr; Back to candidate list
      </Link>

      {state === "loading" && <LoadingState label="Loading candidate..." />}
      {state === "error" && <ErrorState message={error ?? "Unknown error"} onRetry={refresh} />}

      {state === "success" && candidate && (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{candidate.full_name}</h2>
              <p className="text-slate-600">{candidate.position}</p>
            </div>
            <button
              onClick={() => setShowEditForm(true)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Edit
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded border border-slate-200 p-4 text-sm">
            <dt className="text-slate-500">Email</dt>
            <dd>{candidate.email}</dd>
            <dt className="text-slate-500">Phone</dt>
            <dd>{candidate.phone}</dd>
            <dt className="text-slate-500">LinkedIn</dt>
            <dd>{candidate.linkedin_url || "—"}</dd>
            <dt className="text-slate-500">CV</dt>
            <dd>
              {candidate.cv_url ? (
                <a href={candidate.cv_url} target="_blank" className="text-brand hover:underline">
                  View CV
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-slate-500">Years of experience</dt>
            <dd>{candidate.experience_years}</dd>
            <dt className="text-slate-500">Applied on</dt>
            <dd>{candidate.applied_at}</dd>
            <dt className="text-slate-500">Last updated</dt>
            <dd>{candidate.updated_at}</dd>
            <dt className="text-slate-500">Notes on file</dt>
            <dd>{candidate.notes_count}</dd>
          </dl>

          <StatusStageEditor candidate={candidate} onUpdated={setCandidate} />

          <NotesPanel candidateId={id} notes={notes} onNotesChange={setNotes} />
        </div>
      )}

      {showEditForm && candidate && (
        <CandidateFormModal
          mode="edit"
          initialData={candidate}
          onClose={() => setShowEditForm(false)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
