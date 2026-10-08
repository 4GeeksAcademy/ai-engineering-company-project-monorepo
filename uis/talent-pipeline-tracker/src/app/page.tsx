'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Candidate } from '../types/candidate';
import { getCandidates } from '../services/candidates';
import { getCandidateName } from '../utils/candidateUtils';
import SearchBar from '../components/SearchBar';
import StatusFilter from '../components/StatusFilter';
import StageFilter from '../components/StageFilter';
import CandidateList from '../components/CandidateList';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

function CandidatePipelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const statusParam = searchParams.get('status') || '';
  const stageParam = searchParams.get('stage') || '';

  const fetchCandidatesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidates();
      setCandidates(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al obtener el listado de candidaturas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidatesData();
  }, [fetchCandidatesData]);

  // Helper to update query params without full page reload
  const updateQueryParams = useCallback(
    (newStatus: string, newStage: string) => {
      const params = new URLSearchParams();
      if (newStatus) params.set('status', newStatus);
      if (newStage) params.set('stage', newStage);

      const queryString = params.toString();
      const newPath = queryString ? `/?${queryString}` : '/';
      router.push(newPath, { scroll: false });
    },
    [router]
  );

  const handleStatusChange = (newStatus: string) => {
    updateQueryParams(newStatus, stageParam);
  };

  const handleStageChange = (newStage: string) => {
    updateQueryParams(statusParam, newStage);
  };

  // Filter candidates dynamically based on search, status, and stage
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      // 1. Search filter (name and email)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const candidateName = getCandidateName(candidate).toLowerCase();
        const candidateEmail = (candidate.email || '').toLowerCase();
        const matchesSearch =
          candidateName.includes(query) || candidateEmail.includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Status filter
      if (statusParam) {
        if ((candidate.status || '').toLowerCase() !== statusParam.toLowerCase()) {
          return false;
        }
      }

      // 3. Stage filter
      if (stageParam) {
        if ((candidate.stage || '').toLowerCase() !== stageParam.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, searchQuery, statusParam, stageParam]);

  const resetFilters = () => {
    setSearchQuery('');
    router.push('/', { scroll: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Talent Pipeline Tracker
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Gestión y seguimiento de candidaturas en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/candidates/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nueva Candidatura
          </Link>
          <button
            onClick={fetchCandidatesData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            title="Recargar datos"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <StatusFilter value={statusParam} onChange={handleStatusChange} />
            <StageFilter value={stageParam} onChange={handleStageChange} />
            {(searchQuery || statusParam || stageParam) && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors self-center underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Loading candidates..." />
      ) : error ? (
        <ErrorState
          title="Error al cargar candidaturas"
          message={error}
          onRetry={fetchCandidatesData}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Mostrando {filteredCandidates.length} de {candidates.length} candidatos
            </span>
          </div>
          <CandidateList candidates={filteredCandidates} />
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading candidates..." />}>
      <CandidatePipelineContent />
    </Suspense>
  );
}
