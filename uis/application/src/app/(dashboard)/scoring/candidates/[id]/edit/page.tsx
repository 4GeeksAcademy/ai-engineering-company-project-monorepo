'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Candidate, CreateCandidateInput, UpdateCandidateInput } from '@/types/candidate';
import { getCandidateById, updateCandidate } from '@/services/trackerApi';
import CandidateForm from '@/components/candidates/CandidateForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCandidatePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const candidateId = resolvedParams.id;
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const fetchCandidate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidateById(candidateId);
      setCandidate(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos del candidato.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [candidateId]);

  const handleUpdateCandidate = async (data: CreateCandidateInput | UpdateCandidateInput) => {
    setError(null);
    try {
      const updated = await updateCandidate(candidateId, data as UpdateCandidateInput);
      setCandidate(updated);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/candidates/${candidateId}`);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la candidatura.';
      setError(msg);
      throw err;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando datos para edición..." size="lg" />;
  }

  if (error || !candidate) {
    return (
      <div className="max-w-3xl mx-auto">
        <ErrorMessage
          title="Error al cargar candidatura"
          message={error || 'No se pudo obtener el candidato a editar.'}
          onRetry={fetchCandidate}
        />
        <div className="mt-4">
          <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline">
            &larr; Volver al listado principal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Volver al Detalle */}
      <div className="mb-6">
        <Link
          href={`/candidates/${candidate.id}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Detalle del Candidato
        </Link>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-6 flex items-center space-x-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">
            ¡Candidatura actualizada con éxito! Redirigiendo...
          </span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-6">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Candidate Form */}
      <CandidateForm
        initialData={candidate}
        onSubmit={handleUpdateCandidate}
        submitLabel="Guardar Cambios (PUT)"
        isEditing={true}
      />
    </div>
  );
}
