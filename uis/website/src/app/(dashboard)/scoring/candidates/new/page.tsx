'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreateCandidateInput, UpdateCandidateInput } from '@/types/candidate';
import { createCandidate } from '@/services/trackerApi';
import CandidateForm from '@/components/candidates/CandidateForm';

export default function NewCandidatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleCreateCandidate = async (data: CreateCandidateInput | UpdateCandidateInput) => {
    setError(null);
    try {
      const created = await createCandidate(data as CreateCandidateInput);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/candidates/${created.id}`);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la candidatura.';
      setError(msg);
      throw err;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Navigation Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Listado
        </Link>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-6 flex items-center space-x-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">
            ¡Candidatura registrada con éxito! Redirigiendo a la vista de detalle...
          </span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-6">
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Candidate Form Component */}
      <CandidateForm
        onSubmit={handleCreateCandidate}
        submitLabel="Registrar Candidatura (POST)"
        isEditing={false}
      />
    </div>
  );
}
