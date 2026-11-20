'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { Candidate, CandidateStatus, CandidateStage } from '@/types/candidate';
import { getCandidateById } from '@/services/trackerApi';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import StatusStageControls from '@/components/candidates/StatusStageControls';
import CandidateNotesSection from '@/components/candidates/CandidateNotesSection';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CandidateExpedientePage({ params }: PageProps) {
  const { id: candidateId } = use(params);

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
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el expediente del candidato.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandidate();
  }, [fetchCandidate]);

  const handleStatusStageUpdate = (
    newStatus: CandidateStatus,
    newStage: CandidateStage
  ) => {
    setCandidate((prev) =>
      prev ? { ...prev, status: newStatus, stage: newStage } : prev
    );
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner message="Cargando expediente del candidato..." size="lg" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        <ErrorMessage
          title="Error al cargar expediente"
          message={error || 'Candidato no encontrado.'}
          onRetry={fetchCandidate}
        />
        <Link
          href="/scoring"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
        >
          &larr; Volver al pipeline de candidaturas
        </Link>
      </div>
    );
  }

  const score = candidate.score_ia ?? 0;
  const resumeLink = candidate.resume_url || candidate.resume;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Navegación superior */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/scoring"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-[#121721]/90 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400/50 hover:text-emerald-300 transition-all"
        >
          <span>&larr;</span>
          <span>Volver al Pipeline</span>
        </Link>

        <span className="text-xs font-mono text-slate-400">
          EXPEDIENTE #{candidate.id}
        </span>
      </div>

      {/* Cabecera del Expediente */}
      <section className="rounded-2xl border border-slate-700/60 bg-[#121721]/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/80">
              ID #{candidate.id}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              {candidate.name}
            </h1>
            <p className="text-sm font-semibold text-slate-300 mt-1">
              {candidate.position}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge label={candidate.status} variant="status" size="md" />
              <Badge label={candidate.stage} variant="stage" size="md" />
            </div>
          </div>

          {/* Chip Score IA */}
          <div className="inline-flex items-center rounded-xl border border-emerald-400/35 bg-[#0b1017] p-1 shadow-[0_4px_12px_rgba(0,0,0,0.4)] self-start">
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/25 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              SCORE IA
            </span>
            <span className="px-4 py-1.5 text-base font-mono font-extrabold text-white">
              {score}/100
            </span>
          </div>
        </div>

        {/* Datos del Candidato */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-6 text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#0d121a] p-4">
            <dt className="text-slate-400 mb-1">Correo electrónico</dt>
            <dd className="font-semibold text-white break-all">{candidate.email}</dd>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d121a] p-4">
            <dt className="text-slate-400 mb-1">Teléfono</dt>
            <dd className="font-semibold text-white">
              {candidate.phone || 'No especificado'}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d121a] p-4">
            <dt className="text-slate-400 mb-1">Experiencia</dt>
            <dd className="font-bold text-amber-200">
              {candidate.years_of_experience !== undefined &&
                candidate.years_of_experience !== null
                ? `${candidate.years_of_experience} años`
                : 'No especificada'}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0d121a] p-4">
            <dt className="text-slate-400 mb-1">Enlaces</dt>
            <dd className="flex flex-wrap gap-3 font-semibold">
              {candidate.linkedin ? (
                <a
                  href={candidate.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:underline"
                >
                  LinkedIn &rarr;
                </a>
              ) : null}
              {resumeLink ? (
                <a
                  href={resumeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-200 hover:underline"
                >
                  CV / Resume &rarr;
                </a>
              ) : null}
              {!candidate.linkedin && !resumeLink && (
                <span className="text-slate-500">Sin enlaces</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Controles de Estado/Etapa + Notas de Evaluación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StatusStageControls
            candidateId={candidate.id}
            initialStatus={candidate.status}
            initialStage={candidate.stage}
            onUpdate={handleStatusStageUpdate}
          />
        </div>
        <div className="lg:col-span-2">
          <CandidateNotesSection candidateId={candidate.id} />
        </div>
      </div>
    </div>
  );
}
