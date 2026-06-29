"use client";

import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface NoteListProps {
  notes: { id: string; content: string; created_at: string }[];
  onDelete: (noteId: string) => Promise<void>;
  deleting?: boolean;
  error?: string | null;
}

export function NoteList({ notes, onDelete, deleting, error }: NoteListProps) {
  if (error) return <ErrorMessage message={error} />;

  if (notes.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        Sin notas todavía
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li
          key={note.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-200">{note.content}</p>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(note.created_at).toLocaleString("es-ES")}
            </p>
          </div>
          <button
            onClick={() => onDelete(note.id)}
            disabled={deleting}
            className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40"
            title="Eliminar nota"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
