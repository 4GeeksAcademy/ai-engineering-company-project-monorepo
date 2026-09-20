'use client';

import React, { useEffect, useState } from 'react';
import { CandidateNote } from '@/types/candidate';
import { getCandidateNotes, addCandidateNote, deleteCandidateNote } from '@/services/trackerApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface CandidateNotesSectionProps {
  candidateId: number | string;
}

export default function CandidateNotesSection({ candidateId }: CandidateNotesSectionProps) {
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidateNotes(candidateId);
      setNotes(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener las notas del candidato.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [candidateId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const createdNote = await addCandidateNote(candidateId, newNote.trim());
      setNotes((prev) => [createdNote, ...prev]);
      setNewNote('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la nota.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: number | string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota interna?')) return;

    setDeletingId(noteId);
    setError(null);
    try {
      await deleteCandidateNote(candidateId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la nota.';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Notas Internas del Consultor</span>
        <span className="text-xs font-normal text-slate-500 lowercase">({notes.length} notas)</span>
      </h3>

      {/* Formulario para agregar nueva nota */}
      <form onSubmit={handleAddNote} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Añadir una observación o nota sobre el candidato..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={submitting}
            className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || !newNote.trim()}
            className="inline-flex items-center text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Guardar Nota
          </button>
        </div>
      </form>

      {/* Mensaje de Error */}
      {error && (
        <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            &times;
          </button>
        </div>
      )}

      {/* Lista de Notas */}
      {loading ? (
        <LoadingSpinner message="Cargando notas internas..." size="sm" />
      ) : notes.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex-1">
                <p className="text-slate-800 whitespace-pre-wrap">{note.content}</p>
                {note.created_at && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {new Date(note.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDeleteNote(note.id)}
                disabled={deletingId === note.id}
                className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50 disabled:opacity-50"
                title="Eliminar nota"
              >
                {deletingId === note.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic text-center py-4">
          No hay notas registradas para este candidato.
        </p>
      )}
    </div>
  );
}
