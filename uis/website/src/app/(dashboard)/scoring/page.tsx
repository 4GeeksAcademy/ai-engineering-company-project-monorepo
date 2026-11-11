'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Candidate } from '@/types/candidate';
import { getCandidates } from '@/services/trackerApi';
import CandidateCard from '@/components/candidates/CandidateCard';
import CandidateFilters from '@/components/candidates/CandidateFilters';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

function CandidatesContent() {
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('query') || '';
  const status = searchParams.get('status') || 'ALL';
  const stage = searchParams.get('stage') || 'ALL';
  const sort = searchParams.get('sort') || 'score_desc';

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidates({ status, stage, query });
      setCandidates(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar el listado de candidaturas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query, status, stage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCandidates();
  }, [loadCandidates]);

  const filteredCandidates = useMemo(() => {
    const filtered = candidates.filter((candidate) => {
      if (status !== 'ALL' && status.trim() !== '') {
        if (candidate.status.toUpperCase() !== status.toUpperCase()) return false;
      }
      if (stage !== 'ALL' && stage.trim() !== '') {
        if (candidate.stage.toUpperCase() !== stage.toUpperCase()) return false;
      }
      if (query.trim() !== '') {
        const q = query.toLowerCase().trim();
        const nameMatch = candidate.name?.toLowerCase().includes(q);
        const emailMatch = candidate.email?.toLowerCase().includes(q);
        const posMatch = candidate.position?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !posMatch) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const scoreA = a.score_ia ?? 0;
      const scoreB = b.score_ia ?? 0;
      if (sort === 'score_asc') {
        return scoreA - scoreB;
      }
      return scoreB - scoreA;
    });
  }, [candidates, status, stage, query, sort]);

  return (
    <div className="text-slate-100">
      {/* Header Banner unificado con el Panel Overview */}
      <header className="rounded-2xl border border-slate-700/60 bg-gradient-to-r from-[#121721] via-[#151d2a] to-[#121721] p-6 sm:p-8 shadow-2xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center rounded-lg border border-emerald-400/35 bg-[#0b1017] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                AI SCORING
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                Operaciones de Selección
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-3">
              Pipeline de <span className="text-amber-200">Candidaturas</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1.5 max-w-2xl">
              Gestión en tiempo real de los procesos de selección activos con puntuación automatizada.
            </p>
          </div>
          <Link
            href="/incidents"
            className="group relative inline-flex items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-[#0d121a] p-1.5 pl-3.5 text-xs font-bold text-white shadow-inner transition-all duration-300 hover:border-amber-300/65 hover:bg-[#141c28] hover:shadow-[0_0_24px_rgba(253,230,138,0.14)] shrink-0"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde68a]" />
              <span className="tracking-wide text-white group-hover:text-amber-200 transition-colors whitespace-nowrap">
                Analizador de Incidencias
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-mono font-bold text-emerald-300 transition-all duration-300 group-hover:bg-emerald-400 group-hover:text-[#0a0d12]">
              <span>ABRIR</span>
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </span>
          </Link>
        </div>
      </header>

      {/* Componente de Filtros y Buscador */}
      <CandidateFilters />

      {/* Estado: Cargando */}
      {loading && (
        <LoadingSpinner message="Obteniendo candidaturas desde la API REST..." size="lg" />
      )}

      {/* Estado: Error */}
      {error && !loading && (
        <ErrorMessage
          title="Error al conectar con la API de Tracker"
          message={error}
          onRetry={loadCandidates}
        />
      )}

      {/* Estado: Éxito con datos */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Mostrando {filteredCandidates.length} de {candidates.length} candidaturas · Orden:{' '}
              <span className="text-amber-200">
                {sort === 'score_asc' ? 'Menor a Mayor Score IA ↑' : 'Mayor a Menor Score IA ↓'}
              </span>
            </span>
          </div>

          {filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          ) : (
            <div className="bg-[#121721]/90 rounded-2xl border border-slate-700/60 p-12 text-center my-6">
              <h3 className="text-base font-bold text-white">No se encontraron candidaturas</h3>
              <p className="text-xs text-white/80 mt-1 max-w-sm mx-auto">
                No hay candidaturas que coincidan con los filtros seleccionados o el término de búsqueda.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner message="Cargando panel de candidaturas..." />}>
      <CandidatesContent />
    </Suspense>
  );
}
