'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Candidate } from '../types/candidate';
import { getCandidates } from '../services/candidates';
import { getCandidateName } from '../utils/candidateUtils';
import SearchBar from '../components/SearchBar';
import StatusFilter from '../components/StatusFilter';
import StageFilter from '../components/StageFilter';
import CandidateList from '../components/CandidateList';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { getUserMessage } from '../utils/errors';

interface CandidatePipelineProps {
  /** Candidates fetched on the server; null when that fetch failed (the client then loads them itself). */
  initialCandidates: Candidate[] | null;
  initialStatus: string;
  initialStage: string;
}

export default function CandidatePipeline({
  initialCandidates,
  initialStatus,
  initialStage,
}: CandidatePipelineProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates ?? []);
  const [loading, setLoading] = useState<boolean>(initialCandidates === null);
  const [error, setError] = useState<string | null>(null);

  // Filter states. status/stage start from the URL (read on the server) and live in state afterwards,
  // so changing a filter is instant and never waits for a server round trip.
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusParam, setStatus] = useState<string>(initialStatus);
  const [stageParam, setStage] = useState<string>(initialStage);

  // `silent` refreshes in the background (the server copy can be up to 30 s old) without a spinner.
  const fetchCandidatesData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await getCandidates();
      setCandidates(data);
      setError(null);
    } catch (err) {
      if (!silent) setError(getUserMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount is the point of this effect. With server data it only refreshes it silently.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandidatesData(initialCandidates !== null);
  }, [fetchCandidatesData, initialCandidates]);

  // Keep the shareable URL in sync without a navigation (no server round trip, no scroll jump).
  const updateQueryParams = useCallback((newStatus: string, newStage: string) => {
    setStatus(newStatus);
    setStage(newStage);
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    if (newStage) params.set('stage', newStage);
    const queryString = params.toString();
    window.history.replaceState(null, '', queryString ? `/?${queryString}` : '/');
  }, []);

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
    updateQueryParams('', '');
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
            onClick={() => fetchCandidatesData()}
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
          onRetry={() => fetchCandidatesData()}
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
