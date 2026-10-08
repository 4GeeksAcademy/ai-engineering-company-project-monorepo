'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CandidateDetail as CandidateDetailType,
  Note,
} from '../../../types/candidate';
import {
  getCandidateById,
  updateCandidate,
  getNotes,
  createNote,
  deleteNote,
} from '../../../services/candidates';
import CandidateDetailComponent from '../../../components/CandidateDetail';
import AddNoteForm from '../../../components/AddNoteForm';
import NotesList from '../../../components/NotesList';
import LoadingState from '../../../components/LoadingState';
import ErrorState from '../../../components/ErrorState';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CandidateDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const candidateId = resolvedParams.id;

  const [candidate, setCandidate] = useState<CandidateDetailType | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  // Loading states
  const [loadingCandidate, setLoadingCandidate] = useState<boolean>(true);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [updatingStage, setUpdatingStage] = useState<boolean>(false);
  const [addingNote, setAddingNote] = useState<boolean>(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Error & notification states
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch candidate details
  const fetchCandidate = useCallback(async () => {
    if (!candidateId) return;
    setLoadingCandidate(true);
    setCandidateError(null);
    try {
      const data = await getCandidateById(candidateId);
      setCandidate(data);
      if (data.notes && Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
    } catch (err) {
      if (err instanceof Error) {
        setCandidateError(err.message);
      } else {
        setCandidateError('Error al cargar la información del candidato.');
      }
    } finally {
      setLoadingCandidate(false);
    }
  }, [candidateId]);

  // Fetch candidate notes
  const fetchNotes = useCallback(async () => {
    if (!candidateId) return;
    setLoadingNotes(true);
    setNotesError(null);
    try {
      const notesData = await getNotes(candidateId);
      setNotes(notesData);
    } catch (err) {
      if (err instanceof Error) {
        setNotesError(err.message);
      } else {
        setNotesError('Error al cargar las notas del candidato.');
      }
    } finally {
      setLoadingNotes(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchCandidate();
    fetchNotes();
  }, [fetchCandidate, fetchNotes]);

  // Handle status update
  const handleStatusChange = async (newStatus: string) => {
    if (!candidate) return;
    setUpdatingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await updateCandidate(candidateId, { status: newStatus });
      setCandidate((prev) =>
        prev ? { ...prev, ...updated, status: newStatus } : updated
      );
      setActionSuccess('Estado actualizado con éxito.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setActionError(`Error al actualizar el estado: ${err.message}`);
      } else {
        setActionError('Error al actualizar el estado del candidato.');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle stage update
  const handleStageChange = async (newStage: string) => {
    if (!candidate) return;
    setUpdatingStage(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await updateCandidate(candidateId, { stage: newStage });
      setCandidate((prev) =>
        prev ? { ...prev, ...updated, stage: newStage } : updated
      );
      setActionSuccess('Etapa actualizada con éxito.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setActionError(`Error al actualizar la etapa: ${err.message}`);
      } else {
        setActionError('Error al actualizar la etapa del candidato.');
      }
    } finally {
      setUpdatingStage(false);
    }
  };

  // Handle create note
  const handleAddNote = async (content: string) => {
    setAddingNote(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await createNote(candidateId, content);
      setActionSuccess('Nota añadida correctamente.');
      setTimeout(() => setActionSuccess(null), 3000);
      await fetchNotes();
    } catch (err) {
      if (err instanceof Error) {
        setActionError(`Error al crear la nota: ${err.message}`);
      } else {
        setActionError('Error al crear la nota.');
      }
      throw err;
    } finally {
      setAddingNote(false);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await deleteNote(candidateId, noteId);
      setNotes((prevNotes) =>
        prevNotes.filter((n) => (n.id || n.note_id) !== noteId)
      );
      setActionSuccess('Nota eliminada correctamente.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setActionError(`Error al eliminar la nota: ${err.message}`);
      } else {
        setActionError('Error al eliminar la nota.');
      }
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Volver al listado
        </Link>
      </div>

      {/* Global Notification Feedback */}
      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Candidate Details */}
      {loadingCandidate ? (
        <LoadingState message="Cargando perfil del candidato..." />
      ) : candidateError ? (
        <ErrorState
          title="Error al cargar candidato"
          message={candidateError}
          onRetry={fetchCandidate}
        />
      ) : candidate ? (
        <>
          <CandidateDetailComponent
            candidate={candidate}
            onStatusChange={handleStatusChange}
            onStageChange={handleStageChange}
            updatingStatus={updatingStatus}
            updatingStage={updatingStage}
          />

          {/* Notes Section */}
          <div className="mt-10 border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Notas y Seguimiento
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Añade anotaciones importantes sobre entrevistas, feedback o decisiones sobre esta candidatura.
              </p>
            </div>

            <AddNoteForm onAddNote={handleAddNote} loading={addingNote} />

            {notesError ? (
              <ErrorState
                title="Error al cargar notas"
                message={notesError}
                onRetry={fetchNotes}
              />
            ) : (
              <NotesList
                notes={notes}
                onDeleteNote={handleDeleteNote}
                deletingNoteId={deletingNoteId}
                loadingNotes={loadingNotes}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
