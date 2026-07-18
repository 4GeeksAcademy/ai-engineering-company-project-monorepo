"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRecordById, patchRecord } from "@/lib/api/candidates";
import { addNote, deleteNote, getNotes } from "@/lib/api/notes";
import { stageLabels, stageOptions, statusLabels, statusOptions, toStageLabel, toStatusLabel } from "@/lib/labels";
import type { CandidateRecord, CandidateStage, CandidateStatus } from "@/types/candidate";
import type { CandidateNote } from "@/types/note";

function formatDate(rawValue?: string): string {
  if (!rawValue) {
    return "-";
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return date.toLocaleDateString();
}

function formatDateTime(rawValue?: string): string {
  if (!rawValue) {
    return "-";
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return date.toLocaleString();
}

function displayText(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const candidateId = params?.id ?? "";

  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [candidateLoading, setCandidateLoading] = useState<boolean>(true);
  const [candidateError, setCandidateError] = useState<string>("");

  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(true);
  const [notesError, setNotesError] = useState<string>("");

  const [statusDraft, setStatusDraft] = useState<CandidateStatus | "">("");
  const [stageDraft, setStageDraft] = useState<CandidateStage | "">("");
  const [patchLoading, setPatchLoading] = useState<boolean>(false);
  const [patchMessage, setPatchMessage] = useState<string>("");
  const [patchError, setPatchError] = useState<string>("");

  const [newNote, setNewNote] = useState<string>("");
  const [addNoteLoading, setAddNoteLoading] = useState<boolean>(false);
  const [addNoteError, setAddNoteError] = useState<string>("");
  const [addNoteMessage, setAddNoteMessage] = useState<string>("");

  const [deleteLoadingId, setDeleteLoadingId] = useState<string>("");
  const [deleteNoteError, setDeleteNoteError] = useState<string>("");

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    const loadCandidate = async () => {
      setCandidateLoading(true);
      setCandidateError("");

      try {
        const data = await getRecordById(candidateId);
        setCandidate(data);
        setStatusDraft(data.status ?? "");
        setStageDraft(data.stage ?? "");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load candidate details.";
        setCandidateError(message);
      } finally {
        setCandidateLoading(false);
      }
    };

    const loadNotes = async () => {
      setNotesLoading(true);
      setNotesError("");

      try {
        const response = await getNotes(candidateId);
        setNotes(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load candidate notes.";
        setNotesError(message);
      } finally {
        setNotesLoading(false);
      }
    };

    void loadCandidate();
    void loadNotes();
  }, [candidateId]);

  const candidateName = useMemo(() => {
    if (!candidate) {
      return "Candidate";
    }

    return candidate.full_name || "Candidate";
  }, [candidate]);

  const handleSaveStatusAndStage = async () => {
    if (!candidateId) {
      return;
    }

    setPatchLoading(true);
    setPatchMessage("");
    setPatchError("");

    try {
      const updated = await patchRecord(candidateId, {
        status: statusDraft || undefined,
        stage: stageDraft || undefined,
      });

      setCandidate(updated);
      setStatusDraft(updated.status ?? "");
      setStageDraft(updated.stage ?? "");
      setPatchMessage("Candidate pipeline status updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update candidate status or stage.";
      setPatchError(message);
    } finally {
      setPatchLoading(false);
    }
  };

  const handleAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!candidateId) {
      return;
    }

    const trimmed = newNote.trim();
    if (!trimmed) {
      setAddNoteError("Note content is required.");
      return;
    }

    setAddNoteLoading(true);
    setAddNoteError("");
    setAddNoteMessage("");

    try {
      await addNote(candidateId, { content: trimmed });
      const refreshedNotes = await getNotes(candidateId);
      setNotes(refreshedNotes);
      setNewNote("");
      setAddNoteMessage("Note added.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add note.";
      setAddNoteError(message);
    } finally {
      setAddNoteLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string | number) => {
    if (!candidateId) {
      return;
    }

    const normalizedNoteId = String(noteId);
    setDeleteLoadingId(normalizedNoteId);
    setDeleteNoteError("");

    try {
      await deleteNote(candidateId, normalizedNoteId);
      setNotes((previous) => previous.filter((note) => String(note.id) !== normalizedNoteId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete note.";
      setDeleteNoteError(message);
    } finally {
      setDeleteLoadingId("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Nexova People and Talent</p>
              <h1 className="mt-2 text-2xl font-semibold">Candidate Profile</h1>
              <p className="mt-1 text-sm text-slate-600">{candidateName}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/candidates/${candidateId}/edit`}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Edit candidate
              </Link>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Go to Home
              </button>
              <Link
                href="/"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to pipeline list
              </Link>
            </div>
          </div>
        </header>

        {candidateLoading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading candidate details...
          </section>
        ) : null}

        {!candidateLoading && candidateError ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{candidateError}</section>
        ) : null}

        {!candidateLoading && !candidateError && candidate ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Candidate information</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</dt>
                  <dd className="mt-1 text-sm text-slate-800">{displayText(candidate.full_name)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                  <dd className="mt-1 text-sm text-slate-800">{displayText(candidate.email)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                  <dd className="mt-1 text-sm text-slate-800">{displayText(candidate.phone)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</dt>
                  <dd className="mt-1 text-sm text-slate-800">{displayText(candidate.position)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">LinkedIn</dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {candidate.linkedin_url ? (
                      <a
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 underline decoration-sky-300 underline-offset-2"
                      >
                        Open profile
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">CV link</dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {candidate.cv_url ? (
                      <a
                        href={candidate.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 underline decoration-sky-300 underline-offset-2"
                      >
                        Open CV
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Years of experience</dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {displayText(candidate.experience_years ?? candidate.years_of_experience)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application date</dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatDate(candidate.applied_at ?? candidate.application_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</dt>
                  <dd className="mt-1 text-sm text-slate-800">{toStatusLabel(candidate.status)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current stage</dt>
                  <dd className="mt-1 text-sm text-slate-800">{toStageLabel(candidate.stage)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Update pipeline state</h2>
              <p className="mt-1 text-sm text-slate-600">
                Change the candidate status or stage with a single save action.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span className="font-medium">Status</span>
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as CandidateStatus)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-500 focus:ring"
                  >
                    <option value="">Select status</option>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {statusLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  <span className="font-medium">Stage</span>
                  <select
                    value={stageDraft}
                    onChange={(event) => setStageDraft(event.target.value as CandidateStage)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-500 focus:ring"
                  >
                    <option value="">Select stage</option>
                    {stageOptions.map((option) => (
                      <option key={option} value={option}>
                        {stageLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveStatusAndStage}
                  disabled={patchLoading}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {patchLoading ? "Saving..." : "Save status and stage"}
                </button>
                {patchMessage ? <p className="text-sm text-green-700">{patchMessage}</p> : null}
                {patchError ? <p className="text-sm text-red-700">{patchError}</p> : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Internal notes</h2>
              <p className="mt-1 text-sm text-slate-600">Private notes for the People and Talent team.</p>

              <form className="mt-4 flex flex-col gap-2" onSubmit={handleAddNote}>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-note">
                  Add note
                </label>
                <textarea
                  id="new-note"
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring"
                  placeholder="Add interview feedback or follow-up reminders"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={addNoteLoading}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {addNoteLoading ? "Adding..." : "Add note"}
                  </button>
                  {addNoteMessage ? <p className="text-sm text-green-700">{addNoteMessage}</p> : null}
                  {addNoteError ? <p className="text-sm text-red-700">{addNoteError}</p> : null}
                </div>
              </form>

              <div className="mt-6">
                {notesLoading ? <p className="text-sm text-slate-600">Loading notes...</p> : null}
                {!notesLoading && notesError ? <p className="text-sm text-red-700">{notesError}</p> : null}
                {!notesLoading && !notesError && notes.length === 0 ? (
                  <p className="text-sm text-slate-600">No internal notes yet.</p>
                ) : null}

                {!notesLoading && !notesError && notes.length > 0 ? (
                  <ul className="space-y-3">
                    {notes.map((note) => {
                      const noteId = String(note.id);
                      const isDeleting = deleteLoadingId === noteId;

                      return (
                        <li key={noteId} className="rounded-md border border-slate-200 p-3">
                          <p className="text-sm text-slate-800">{note.content}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-500">Updated: {formatDateTime(note.updated_at ?? note.created_at)}</p>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={isDeleting}
                              className="text-xs font-medium text-red-700 underline decoration-red-300 underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {deleteNoteError ? <p className="mt-2 text-sm text-red-700">{deleteNoteError}</p> : null}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
