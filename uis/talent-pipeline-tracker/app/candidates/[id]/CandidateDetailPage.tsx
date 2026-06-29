"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Candidate, CandidatePatch } from "@/lib/types";
import { getRecord, deleteRecord } from "@/lib/api";
import { useCandidateNotes } from "@/hooks/useCandidateNotes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StageBadge } from "@/components/ui/StageBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { CandidateStatusActions } from "@/components/candidates/CandidateStatusActions";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import { NoteList } from "@/components/notes/NoteList";
import { NoteForm } from "@/components/notes/NoteForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function CandidateDetailPage({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    notes,
    adding,
    loading: notesLoading,
    error: notesError,
    add: addNote,
    remove: removeNote,
  } = useCandidateNotes(recordId, candidate?.notes ?? []);

  useEffect(() => {
    let cancelled = false;

    getRecord(recordId)
      .then((data) => {
        if (!cancelled) setCandidate(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar candidato",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recordId]);

  const handleStatusUpdated = useCallback(
    (patch: CandidatePatch) => {
      if (!candidate) return;
      setCandidate({
        ...candidate,
        ...patch,
      });
    },
    [candidate],
  );

  const handleSaved = useCallback(
    (updated: Candidate) => {
      setCandidate(updated);
      setEditOpen(false);
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteRecord(recordId);
      router.push("/");
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [recordId, router]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <ErrorMessage
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );

  if (!candidate) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Volver
      </button>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {candidate.full_name}
            </h1>
            <p className="mt-1 text-slate-400">{candidate.position}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/5"
            >
              Editar
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/20"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoRow label="Email" value={candidate.email} />
          <InfoRow label="Teléfono" value={candidate.phone} />
          <InfoRow label="Años de experiencia" value={`${candidate.experience_years}`} />
          <InfoRow label="Fecha de aplicación" value={new Date(candidate.applied_at).toLocaleDateString("es-ES")} />
          {candidate.linkedin_url && (
            <InfoRow label="LinkedIn">
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                Ver perfil
              </a>
            </InfoRow>
          )}
          {candidate.cv_url && (
            <InfoRow label="CV">
              <a
                href={candidate.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                Descargar CV
              </a>
            </InfoRow>
          )}
          <InfoRow label="Estado">
            <StatusBadge status={candidate.status} />
          </InfoRow>
          <InfoRow label="Etapa">
            <StageBadge stage={candidate.stage} />
          </InfoRow>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Actualizar estado y etapa
        </h2>
        <CandidateStatusActions
          recordId={recordId}
          currentStatus={candidate.status}
          currentStage={candidate.stage}
          onUpdated={handleStatusUpdated}
        />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Notas</h2>
        <NoteForm onAdd={addNote} adding={adding} />
        <div className="mt-4">
          <NoteList
            notes={notes}
            onDelete={removeNote}
            deleting={notesLoading}
            error={notesError}
          />
        </div>
      </div>

      <CandidateForm
        open={editOpen}
        candidate={candidate}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar candidatura"
        message={`¿Eliminar la candidatura de ${candidate.full_name}? Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {children ?? (
        <p className="mt-0.5 text-sm text-slate-200">{value}</p>
      )}
    </div>
  );
}
