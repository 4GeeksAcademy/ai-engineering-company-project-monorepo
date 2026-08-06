'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { StageBadge } from '../../components/ui/StageBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { STAGE_LABELS, STATUS_LABELS } from '../../../lib/candidatesMappings';
import {
  createCandidateNote,
  deleteCandidate,
  deleteCandidateNote,
  getCandidateById,
  getCandidateNotes,
  updateCandidateStage,
  updateCandidateStatus,
} from '../../../services/candidatesApi';
import type { Candidate, CandidateStage, CandidateStatus, Note } from '../../../types/candidate';

const statusOptions = Object.entries(STATUS_LABELS) as Array<[CandidateStatus, string]>;
const stageOptions = Object.entries(STAGE_LABELS) as Array<[CandidateStage, string]>;

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params?.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteContent, setNoteContent] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [notesLoading, setNotesLoading] = useState<boolean>(true);

  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [stageUpdating, setStageUpdating] = useState<boolean>(false);
  const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const clearSuccessSoon = useCallback(() => {
    window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      if (!candidateId) {
        if (isMounted) {
          setError('No se pudo identificar la candidatura.');
          setNotesError('No se pudo identificar la candidatura para cargar notas.');
          setLoading(false);
          setNotesLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setNotesLoading(true);
        setError(null);
        setNotesError(null);
      }

      try {
        const [candidateData, notesData] = await Promise.all([
          getCandidateById(candidateId),
          getCandidateNotes(candidateId),
        ]);

        if (isMounted) {
          setCandidate(candidateData);
          setNotes(notesData);
        }
      } catch (fetchError) {
        if (isMounted) {
          const message = (fetchError as Error).message || 'No fue posible cargar la candidatura.';
          setError(message);
          setNotesError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setNotesLoading(false);
        }
      }
    };

    void loadPageData();

    return () => {
      isMounted = false;
    };
  }, [candidateId, reloadKey]);

  const detailRows = useMemo(() => {
    if (!candidate) {
      return [];
    }

    return [
      { label: 'Nombre completo', value: candidate.full_name },
      { label: 'Email', value: candidate.email },
      { label: 'Telefono', value: candidate.phone },
      { label: 'Puesto', value: candidate.position },
      { label: 'LinkedIn', value: candidate.linkedin_url },
      { label: 'CV', value: candidate.cv_url },
      { label: 'Anos de experiencia', value: String(candidate.experience_years) },
    ];
  }, [candidate]);

  const handleStatusChange = async (nextStatus: CandidateStatus) => {
    if (!candidate || !candidateId || candidate.status === nextStatus) {
      return;
    }

    const previousCandidate = candidate;
    setStatusUpdating(true);
    setError(null);
    setCandidate({ ...candidate, status: nextStatus });

    try {
      const updated = await updateCandidateStatus(candidateId, nextStatus);
      setCandidate(updated);
      setSuccessMessage('Estado actualizado correctamente.');
      clearSuccessSoon();
    } catch (updateError) {
      setCandidate(previousCandidate);
      setError((updateError as Error).message || 'No fue posible actualizar el estado.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStageChange = async (nextStage: CandidateStage) => {
    if (!candidate || !candidateId || candidate.stage === nextStage) {
      return;
    }

    const previousCandidate = candidate;
    setStageUpdating(true);
    setError(null);
    setCandidate({ ...candidate, stage: nextStage });

    try {
      const updated = await updateCandidateStage(candidateId, nextStage);
      setCandidate(updated);
      setSuccessMessage('Etapa actualizada correctamente.');
      clearSuccessSoon();
    } catch (updateError) {
      setCandidate(previousCandidate);
      setError((updateError as Error).message || 'No fue posible actualizar la etapa.');
    } finally {
      setStageUpdating(false);
    }
  };

  const handleNoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!candidateId) {
      setNotesError('No se pudo identificar la candidatura para crear la nota.');
      return;
    }

    const content = noteContent.trim();
    if (!content) {
      return;
    }

    setNoteSubmitting(true);
    setNotesError(null);

    try {
      const created = await createCandidateNote(candidateId, { content });
      setNotes((current) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        return [created, ...safeCurrent];
      });
      setNoteContent('');
      setSuccessMessage('Nota agregada correctamente.');
      clearSuccessSoon();
    } catch (submitError) {
      setNotesError((submitError as Error).message || 'No fue posible crear la nota.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!candidateId) {
      setNotesError('No se pudo identificar la candidatura para eliminar la nota.');
      return;
    }

    const previousNotes = notes;
    setDeletingNoteId(noteId);
    setNotesError(null);
    setNotes((current) => current.filter((note) => note.id !== noteId));

    try {
      await deleteCandidateNote(candidateId, noteId);
      setSuccessMessage('Nota eliminada correctamente.');
      clearSuccessSoon();
    } catch (deleteError) {
      setNotes(previousNotes);
      setNotesError((deleteError as Error).message || 'No fue posible eliminar la nota.');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidateId) {
      return;
    }

    const userConfirmed = window.confirm('Esta accion eliminara la candidatura. Deseas continuar?');
    if (!userConfirmed) {
      return;
    }

    setDeletingCandidate(true);
    setError(null);

    try {
      await deleteCandidate(candidateId);
      window.location.href = '/candidaturas';
    } catch (deleteError) {
      setError((deleteError as Error).message || 'No fue posible eliminar la candidatura.');
    } finally {
      setDeletingCandidate(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Spinner label="Cargando detalle del candidato..." />
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <Alert variant="error" title="Error al cargar candidatura">
        <div className="space-y-3">
          <p>{error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((previous) => previous + 1)}
              className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Reintentar
            </button>
            <Link
              href="/candidaturas"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver al listado
            </Link>
          </div>
        </div>
      </Alert>
    );
  }

  if (!candidate) {
    return (
      <Alert variant="error" title="Candidatura no encontrada">
        <div className="space-y-3">
          <p>No se encontro informacion para la candidatura solicitada.</p>
          <Link
            href="/candidaturas"
            className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Volver al listado
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <section className="space-y-6">
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-5 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-semibold text-slate-900">{candidate.full_name || 'Sin nombre'}</h2>
          <StatusBadge status={candidate.status} />
          <StageBadge stage={candidate.stage} />
          <Link
            href={`/candidaturas/${candidate.id}/edit`}
            className="ml-auto inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Editar datos
          </Link>
          <button
            type="button"
            disabled={deletingCandidate}
            onClick={handleDeleteCandidate}
            className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingCandidate ? 'Eliminando...' : 'Eliminar candidatura'}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {detailRows.map((row) => (
            <div key={row.label} className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</p>
              <p className="mt-1 break-all text-sm text-slate-900">{row.value || '-'}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">Actualizar proceso</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="status" className="text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              id="status"
              value={candidate.status}
              disabled={statusUpdating}
              onChange={(event) => handleStatusChange(event.target.value as CandidateStatus)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2 disabled:opacity-60"
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="stage" className="text-sm font-medium text-slate-700">
              Etapa
            </label>
            <select
              id="stage"
              value={candidate.stage}
              disabled={stageUpdating}
              onChange={(event) => handleStageChange(event.target.value as CandidateStage)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2 disabled:opacity-60"
            >
              {stageOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">Notas</h3>

        <form onSubmit={handleNoteSubmit} className="mb-5 space-y-2">
          <label htmlFor="note-content" className="text-sm font-medium text-slate-700">
            Nueva nota
          </label>
          <textarea
            id="note-content"
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            placeholder="Escribe una observacion sobre la candidatura"
            rows={4}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
          />
          <button
            type="submit"
            disabled={noteSubmitting || !noteContent.trim()}
            className="inline-flex items-center rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {noteSubmitting ? 'Guardando...' : 'Agregar nota'}
          </button>
        </form>

        {notesError ? (
          <Alert variant="error">
            <div className="space-y-3">
              <p>{notesError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((previous) => previous + 1)}
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Reintentar
              </button>
            </div>
          </Alert>
        ) : null}

        {notesLoading ? (
          <Spinner label="Cargando notas..." />
        ) : (
          <div className="space-y-3">
            {!notes || !Array.isArray(notes) || notes.length === 0 ? (
              <p className="text-sm text-slate-600">Aun no hay notas registradas para esta candidatura.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{note.content || 'Sin contenido'}</p>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingNoteId === note.id}
                    className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingNoteId === note.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </article>
    </section>
  );
}
