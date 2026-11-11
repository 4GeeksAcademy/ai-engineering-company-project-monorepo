'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { Candidate, CandidateStatus, CandidateStage } from '@/types/candidate';
import { getCandidateById } from '@/services/trackerApi';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import StatusStageControls from '@/components/candidates/StatusStageControls';
import dynamic from 'next/dynamic';

const CandidateNotesSection = dynamic(
  () => import('@/components/candidates/CandidateNotesSection'),
  {
    loading: () => (
      <div className="bg-[#121721]/80 backdrop-blur-xl rounded-2xl border border-emerald-500/20 p-8 text-center text-emerald-100/60">
        Cargando notas e historial...
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CandidateDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const candidateId = resolvedParams.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidateById(candidateId);
      setCandidate(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar la información del candidato.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandidate();
  }, [fetchCandidate]);

  const handleStatusStageUpdate = (newStatus: CandidateStatus, newStage: CandidateStage) => {
    setCandidate((prev) => (prev ? { ...prev, status: newStatus, stage: newStage } : prev));
  };

  if (loading) {
    return <LoadingSpinner message="Cargando detalles de la candidatura..." size="lg" />;
  }

  if (error || !candidate) {
    return (
      <div className="max-w-3xl mx-auto">
        <ErrorMessage
          title="Error al cargar candidato"
          message={error || 'Candidato no encontrado.'}
          onRetry={fetchCandidate}
        />
        <div className="mt-4">
          <Link href="/scoring" className="text-xs font-semibold text-emerald-400 hover:underline">
            &larr; Volver al listado de candidaturas
          </Link>
        </div>
      </div>
    );
  }

  const resumeLink = candidate.resume_url || candidate.resume;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Botón Volver y Acciones Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/scoring"
          className="inline-flex items-center text-xs font-semibold text-emerald-100/80 hover:text-white bg-[#121721]/80 border border-emerald-500/20 hover:border-emerald-400/40 px-3.5 py-2 rounded-xl shadow-sm transition-all"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Listado
        </Link>

        <Link
          href={`/scoring/candidates/${candidate.id}/edit`}
          className="inline-flex items-center text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-[#0a0d12] px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar Candidatura
        </Link>
      </div>

      {/* Tarjeta Principal del Candidato */}
      <div className="bg-[#121721]/80 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-emerald-500/15 pb-5">
          <div>
            <span className="text-xs font-mono text-amber-200/80">ID Candidatura: #{candidate.id}</span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">{candidate.name}</h1>
            <p className="text-sm font-semibold text-emerald-400 mt-1">{candidate.position}</p>
          </div>
          <div className="flex sm:flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-100/50">Estado:</span>
              <Badge label={candidate.status} variant="status" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-100/50">Etapa:</span>
              <Badge label={candidate.stage} variant="stage" />
            </div>
          </div>
        </div>

        {/* Detalle de Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-5 text-xs">
          <div>
            <span className="text-emerald-100/50 font-medium block">Correo Electrónico</span>
            <span className="text-white font-semibold mt-1 block truncate">{candidate.email}</span>
          </div>

          <div>
            <span className="text-emerald-100/50 font-medium block">Teléfono de Contacto</span>
            <span className="text-white font-semibold mt-1 block">
              {candidate.phone || 'No especificado'}
            </span>
          </div>

          <div>
            <span className="text-emerald-100/50 font-medium block">Años de Experiencia</span>
            <span className="text-amber-200 font-bold mt-1 block">
              {candidate.years_of_experience !== undefined && candidate.years_of_experience !== null
                ? `${candidate.years_of_experience} años`
                : 'No especificado'}
            </span>
          </div>

          <div>
            <span className="text-emerald-100/50 font-medium block">Perfil de LinkedIn</span>
            {candidate.linkedin ? (
              <a
                href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline font-semibold mt-1 inline-flex items-center"
              >
                Ver Perfil
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <span className="text-emerald-100/40 mt-1 block">No proporcionado</span>
            )}
          </div>

          <div>
            <span className="text-emerald-100/50 font-medium block">Curriculum Vitae (CV)</span>
            {resumeLink ? (
              <a
                href={resumeLink.startsWith('http') ? resumeLink : `https://${resumeLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline font-semibold mt-1 inline-flex items-center"
              >
                Ver Documento CV
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <span className="text-emerald-100/40 mt-1 block">No adjuntado</span>
            )}
          </div>

          <div>
            <span className="text-emerald-100/50 font-medium block">Fecha de Aplicación</span>
            <span className="text-white font-semibold mt-1 block">
              {candidate.applied_at
                ? new Date(candidate.applied_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : candidate.created_at
                ? new Date(candidate.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Reciente'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Rápido de Estado y Etapa (PATCH) */}
      <StatusStageControls
        candidateId={candidate.id}
        initialStatus={candidate.status}
        initialStage={candidate.stage}
        onUpdate={handleStatusStageUpdate}
      />

      {/* Sección de Notas Internas (GET/POST/DELETE) */}
      <CandidateNotesSection candidateId={candidate.id} />
    </div>
  );
}
