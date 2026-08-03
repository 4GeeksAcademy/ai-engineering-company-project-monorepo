"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CandidateForm } from "@/components/CandidateForm";
import { NotesPanel } from "@/components/NotesPanel";
import { formatDate } from "@/lib/format";
import { STAGE_LABELS, STAGE_OPTIONS, STATUS_LABELS, STATUS_OPTIONS } from "@/lib/labels";
import {
  addNote,
  deleteNote,
  getNotesByRecord,
  getRecordById,
  patchRecord,
  updateRecord,
} from "@/services/records";
import { CandidateInput, CandidateRecord, CandidateStage, CandidateStatus, Note } from "@/types/records";

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params.id;

  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  const [candidateLoading, setCandidateLoading] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [statusSaving, setStatusSaving] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCandidate() {
      if (!candidateId) return;

      setCandidateLoading(true);
      setCandidateError(null);

      try {
        const data = await getRecordById(candidateId);
        if (!ignore) {
          setCandidate(data);
        }
      } catch (error) {
        if (!ignore) {
          setCandidateError(error instanceof Error ? error.message : "Could not load candidate.");
        }
      } finally {
        if (!ignore) {
          setCandidateLoading(false);
        }
      }
    }

    async function loadNotes() {
      if (!candidateId) return;

      setNotesLoading(true);
      setNotesError(null);

      try {
        const data = await getNotesByRecord(candidateId);
        if (!ignore) {
          setNotes(data);
        }
      } catch (error) {
        if (!ignore) {
          setNotesError(error instanceof Error ? error.message : "Could not load notes.");
        }
      } finally {
        if (!ignore) {
          setNotesLoading(false);
        }
      }
    }

    loadCandidate();
    loadNotes();

    return () => {
      ignore = true;
    };
  }, [candidateId]);

  async function handleStatusChange(nextStatus: CandidateStatus) {
    if (!candidate) return;

    setStatusSaving(true);
    setFeedback(null);

    try {
      const updated = await patchRecord(candidate.id, { status: nextStatus });
      setCandidate(updated);
      setFeedback({ type: "success", message: "Candidate status updated." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not update status." });
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleStageChange(nextStage: CandidateStage) {
    if (!candidate) return;

    setStageSaving(true);
    setFeedback(null);

    try {
      const updated = await patchRecord(candidate.id, { stage: nextStage });
      setCandidate(updated);
      setFeedback({ type: "success", message: "Candidate stage updated." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not update stage." });
    } finally {
      setStageSaving(false);
    }
  }

  async function handleEditCandidate(payload: CandidateInput) {
    if (!candidate) return;
    const updated = await updateRecord(candidate.id, payload);
    setCandidate(updated);
  }

  async function handleAddNote(content: string) {
    if (!candidate) return;

    const created = await addNote(candidate.id, { content });
    setNotes((previous) => [created, ...previous]);
    setCandidate((previous) => (previous ? { ...previous, notes_count: previous.notes_count + 1 } : previous));
  }

  async function handleDeleteNote(noteId: string) {
    if (!candidate) return;

    await deleteNote(candidate.id, noteId);
    setNotes((previous) => previous.filter((note) => note.id !== noteId));
    setCandidate((previous) =>
      previous
        ? {
            ...previous,
            notes_count: Math.max(0, previous.notes_count - 1),
          }
        : previous,
    );
  }

  if (candidateLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">Loading candidate detail...</p>
      </main>
    );
  }

  if (candidateError || !candidate) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {candidateError ?? "Candidate not found."}
        </div>
        <Link href="/" className="mt-4 inline-block text-sm text-slate-800 underline">
          Back to candidate list
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8">
      <header className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-6">
        <Link href="/" className="text-sm text-cyan-700 underline">
          Back to candidate list
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{candidate.full_name}</h1>
        <p className="text-sm text-slate-700">TrackFlow Executive Assistant recruitment profile.</p>
      </header>

      {feedback && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Candidate detail</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Full name</dt>
            <dd className="text-slate-900">{candidate.full_name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{candidate.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="text-slate-900">{candidate.phone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Position</dt>
            <dd className="text-slate-900">{candidate.position}</dd>
          </div>
          <div>
            <dt className="text-slate-500">LinkedIn</dt>
            <dd className="text-slate-900 break-all">{candidate.linkedin_url || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">CV link</dt>
            <dd className="text-slate-900 break-all">{candidate.cv_url || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Years of experience</dt>
            <dd className="text-slate-900">{candidate.experience_years}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Application date</dt>
            <dd className="text-slate-900">{formatDate(candidate.applied_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-900">{STATUS_LABELS[candidate.status]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Stage</dt>
            <dd className="text-slate-900">{STAGE_LABELS[candidate.stage]}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Update status and stage</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-700">
            Status
            <select
              value={candidate.status}
              onChange={(event) => handleStatusChange(event.target.value as CandidateStatus)}
              className="rounded-md border border-slate-300 px-3 py-2"
              disabled={statusSaving}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            Stage
            <select
              value={candidate.stage}
              onChange={(event) => handleStageChange(event.target.value as CandidateStage)}
              className="rounded-md border border-slate-300 px-3 py-2"
              disabled={stageSaving}
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <NotesPanel
        notes={notes}
        isLoading={notesLoading}
        error={notesError}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      <CandidateForm
        mode="edit"
        initialValues={{
          full_name: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          position: candidate.position,
          linkedin_url: candidate.linkedin_url,
          cv_url: candidate.cv_url,
          experience_years: candidate.experience_years,
        }}
        submitLabel="Save profile changes"
        onSubmit={handleEditCandidate}
      />
    </main>
  );
}
