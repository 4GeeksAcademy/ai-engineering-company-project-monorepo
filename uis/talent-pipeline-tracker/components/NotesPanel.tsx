"use client";

import { FormEvent, useState } from "react";
import { formatDate } from "@/lib/format";
import { Note } from "@/types/records";

interface NotesPanelProps {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export function NotesPanel({ notes, isLoading, error, onAddNote, onDeleteNote }: NotesPanelProps) {
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setFeedback({ type: "error", message: "Note content is required." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await onAddNote(content.trim());
      setContent("");
      setFeedback({ type: "success", message: "Note added." });
    } catch (errorMessage) {
      setFeedback({
        type: "error",
        message: errorMessage instanceof Error ? errorMessage.message : "Could not add note.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    setFeedback(null);

    try {
      await onDeleteNote(noteId);
      setFeedback({ type: "success", message: "Note deleted." });
    } catch (errorMessage) {
      setFeedback({
        type: "error",
        message: errorMessage instanceof Error ? errorMessage.message : "Could not delete note.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Internal notes</h2>

      <form className="mt-3 flex gap-2" onSubmit={handleAddNote}>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add call or interview notes"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-70"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Add note"}
        </button>
      </form>

      {feedback && (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-600">Loading notes...</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!isLoading && !error && (
        <ul className="mt-4 space-y-2">
          {notes.length === 0 && <li className="text-sm text-slate-600">No notes yet.</li>}
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-800">{note.content}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="text-xs text-red-700 hover:text-red-900 disabled:opacity-50"
                  disabled={deletingId === note.id}
                >
                  {deletingId === note.id ? "Deleting..." : "Delete"}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{formatDate(note.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
