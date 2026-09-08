'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Candidate } from '@/types/candidate';
import { getCandidates } from '@/services/api';
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

  const loadCandidates = async () => {
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
  };

  useEffect(() => {
    loadCandidates();
  }, [query, status, stage]);

  // Filtrado defensivo en memoria
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      // Filtro por Estado
      if (status !== 'ALL' && status.trim() !== '') {
        if (candidate.status.toUpperCase() !== status.toUpperCase()) return false;
      }
      // Filtro por Etapa
      if (stage !== 'ALL' && stage.trim() !== '') {
        if (candidate.stage.toUpperCase() !== stage.toUpperCase()) return false;
      }
      // Filtro por Búsqueda (nombre, email o puesto)
      if (query.trim() !== '') {
        const q = query.toLowerCase().trim();
        const nameMatch = candidate.name?.toLowerCase().includes(q);
        const emailMatch = candidate.email?.toLowerCase().includes(q);
        const posMatch = candidate.position?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !posMatch) return false;
      }
      return true;
    });
  }, [candidates, status, stage, query]);

  return (
    <div>
      {/* Header Banner del departamento */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pipeline de Candidaturas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestión en tiempo real de los procesos de selección activos para Operaciones de Selección.
          </p>
        </div>
        <Link 
          href="/incidents" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          Analizador de Incidencias
        </Link>
      </div>

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
          {/* Métricas rápidas */}
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mostrando {filteredCandidates.length} de {candidates.length} candidaturas
            </span>
          </div>

          {/* Grid de tarjetas o Estado Vacío */}
          {filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center my-6">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900">No se encontraron candidaturas</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
