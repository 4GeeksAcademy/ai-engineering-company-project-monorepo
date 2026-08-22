"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Note } from "@/types/candidate";

export default function NotesPanel({
  candidateId,
  notes,
  onNotesChange,
}: {
  candidateId: string;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Note cannot be empty.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const newNote = await api.addNote(candidateId, text.trim());
      onNotesChange([...notes, newNote]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add note.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await api.deleteNote(candidateId, noteId);
      onNotesChange(notes.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete note.");
    }
  }

  return (
    <div>
      <h3 className="mb-2 font-medium">Internal Notes</h3>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between rounded border border-slate-200 p-2 text-sm"
            >
              <span>{note.content}</span>
              <button
                onClick={() => handleDelete(note.id)}
                className="ml-3 shrink-0 text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Add a note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-brand px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>
    </div>
  );
}
