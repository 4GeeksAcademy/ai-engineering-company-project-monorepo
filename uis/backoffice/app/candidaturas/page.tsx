'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { StageBadge } from '../components/ui/StageBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { STAGE_LABELS, STATUS_LABELS } from '../../lib/candidatesMappings';
import { getCandidates } from '../../services/candidatesApi';
import type { Candidate, CandidateStage, CandidateStatus } from '../../types/candidate';

const statusOptions = Object.entries(STATUS_LABELS) as Array<[CandidateStatus, string]>;
const stageOptions = Object.entries(STAGE_LABELS) as Array<[CandidateStage, string]>;

function parseStatusFilter(value: string | null): CandidateStatus | '' {
  if (!value) {
    return '';
  }

  return value in STATUS_LABELS ? (value as CandidateStatus) : '';
}

function parseStageFilter(value: string | null): CandidateStage | '' {
  if (!value) {
    return '';
  }

  return value in STAGE_LABELS ? (value as CandidateStage) : '';
}

function CandidatesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);

  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const stageFilter = parseStageFilter(searchParams.get('stage'));

  useEffect(() => {
    let isMounted = true;

    async function loadCandidates() {
      setLoading(true);
      setError(null);

      try {
        const data = await getCandidates();
        if (isMounted) {
          setCandidates(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError((fetchError as Error).message || 'No fue posible cargar las candidaturas.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCandidates();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const matchesStatus = statusFilter ? candidate.status === statusFilter : true;
      const matchesStage = stageFilter ? candidate.stage === stageFilter : true;

      const matchesSearch = normalizedSearch
        ? (candidate.full_name ?? '').toLowerCase().includes(normalizedSearch) ||
          (candidate.email ?? '').toLowerCase().includes(normalizedSearch)
        : true;

      return matchesStatus && matchesStage && matchesSearch;
    });
  }, [candidates, searchTerm, statusFilter, stageFilter]);

  const updateQueryParam = (key: 'status' | 'stage', value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const navigateToCandidate = (candidateId: string) => {
    router.push(`/candidaturas/${candidateId}`);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Candidaturas</h2>
        <Link
          href="/candidaturas/new"
          className="inline-flex items-center rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800"
        >
          Nueva candidatura
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="search" className="text-sm font-medium text-slate-700">
              Buscar por nombre o email
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ej. Laura Garcia o laura@email.com"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => updateQueryParam('status', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            >
              <option value="">Todos los estados</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="stage-filter" className="text-sm font-medium text-slate-700">
              Etapa
            </label>
            <select
              id="stage-filter"
              value={stageFilter}
              onChange={(event) => updateQueryParam('stage', event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
            >
              <option value="">Todas las etapas</option>
              {stageOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Spinner label="Cargando candidaturas..." />
        </div>
      ) : null}

      {error ? (
        <Alert variant="error" title="Error al cargar candidaturas">
          <div className="space-y-3">
            <p>{error}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((previous) => previous + 1)}
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Reintentar
              </button>
              <Link
                href="/"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </Alert>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  Puesto
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Etapa
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => navigateToCandidate(candidate.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigateToCandidate(candidate.id);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Abrir candidatura de ${candidate.full_name}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/candidaturas/${candidate.id}`} className="hover:text-sky-700 hover:underline">
                      {candidate.full_name || 'Sin nombre'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{candidate.position || 'Sin puesto definido'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={candidate.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge stage={candidate.stage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCandidates.length === 0 ? (
            <div className="border-t border-slate-100 px-4 py-6 text-sm text-slate-600">
              No hay candidaturas que coincidan con los filtros actuales.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Spinner label="Cargando candidaturas..." />
        </div>
      }
    >
      <CandidatesPageContent />
    </Suspense>
  );
}
