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
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:text-zinc-300"
        >
          {submitting ? "Adding…" : "Add note"}
        </button>
      </form>

      {error && (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {initialNotes.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-400">
          No notes yet.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {initialNotes.map((note) => (
            <li key={note.id} className="flex items-start gap-3 px-4 py-3">
              <p className="flex-1 text-sm text-zinc-700">{note.content}</p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-xs text-zinc-400">
                  {formatDateTime(note.created_at)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={deletingId === note.id}
                  className="text-xs text-zinc-400 hover:text-rose-600 disabled:text-zinc-200"
                >
                  {deletingId === note.id ? "…" : "✕"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
