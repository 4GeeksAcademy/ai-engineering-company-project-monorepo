'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Candidate, CandidateDetail } from '../../../../types/candidate';
import { getCandidateById, updateCandidate } from '../../../../services/candidates';
import CandidateForm from '../../../../components/CandidateForm';
import LoadingState from '../../../../components/LoadingState';
import ErrorState from '../../../../components/ErrorState';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCandidatePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const candidateId = resolvedParams.id;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidateById(candidateId);
      setCandidate(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al obtener la información del candidato.');
      }
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const handleUpdate = async (formData: Partial<Candidate>) => {
    await updateCandidate(candidateId, formData);
    router.push(`/candidates/${candidateId}`);
  };

  const handleCancel = () => {
    router.push(`/candidates/${candidateId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/candidates/${candidateId}`}
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
          Volver al perfil
        </Link>
      </div>

      {loading ? (
        <LoadingState message="Cargando información para edición..." />
      ) : error ? (
        <ErrorState
          title="Error al cargar candidato"
          message={error}
          onRetry={fetchCandidate}
        />
      ) : candidate ? (
        <CandidateForm
          initialData={candidate}
          onSubmit={handleUpdate}
          isEditing={true}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}
