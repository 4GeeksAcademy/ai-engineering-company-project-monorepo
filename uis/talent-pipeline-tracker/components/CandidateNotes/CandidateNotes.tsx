"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNote, deleteNote } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { CandidateNote } from "@/lib/types";

interface CandidateNotesProps {
  candidateId: string;
  initialNotes: CandidateNote[];
}

export default function CandidateNotes({
  candidateId,
  initialNotes,
}: CandidateNotesProps) {
  const router = useRouter();

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createNote(candidateId, { content });
      setDraft("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add note.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (deletingId) return;
    setDeletingId(noteId);
    setError(null);
    try {
      await deleteNote(candidateId, noteId);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete note.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
        Notes ({initialNotes.length})
      </div>

      {/* Add note form */}
      <form
        onSubmit={handleAddNote}
        className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 sm:flex-row"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about this candidate…"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={!draft.trim() || submitting}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {submitting ? "Adding…" : "Add note"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {/* Notes list */}
      {initialNotes.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">
          No notes yet for this candidate.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {initialNotes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm text-zinc-800">
                  {note.content}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {formatDateTime(note.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteNote(note.id)}
                disabled={deletingId === note.id}
                aria-label={`Delete note: ${note.content}`}
                title="Delete note"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === note.id ? (
                  <span className="text-xs">…</span>
                ) : (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}