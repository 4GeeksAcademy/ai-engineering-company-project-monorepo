import React from 'react';
import { Note } from '../types/candidate';
import { getNoteId, getNoteCreatedAt } from '../utils/candidateUtils';
import LoadingState from './LoadingState';

interface NotesListProps {
  notes: Note[];
  onDeleteNote: (noteId: string) => Promise<void>;
  deletingNoteId?: string | null;
  loadingNotes?: boolean;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  onDeleteNote,
  deletingNoteId = null,
  loadingNotes = false,
}) => {
  if (loadingNotes) {
    return <LoadingState message="Cargando notas del candidato..." />;
  }

  if (notes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
        No hay notas registradas para este candidato. Añade la primera nota arriba.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => {
        const noteId = getNoteId(note);
        const createdAt = getNoteCreatedAt(note);
        const isDeleting = deletingNoteId === noteId;

        return (
          <div
            key={noteId || Math.random().toString()}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
          >
            <div className="flex-1">
              <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
              {createdAt && (
                <span className="text-xs text-slate-400 dark:text-slate-500 block mt-2">
                  {createdAt}
                </span>
              )}
            </div>

            <button
              onClick={() => noteId && onDeleteNote(noteId)}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-700 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-all self-start sm:self-auto cursor-pointer disabled:opacity-50"
              title="Eliminar nota"
            >
              {isDeleting ? (
                <>
                  <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Eliminar
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotesList;
