"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getStageLabel, getStatusLabel } from "@/lib/candidate-labels";
import type { CandidateStage, CandidateStatus } from "@/types/models";

interface CandidateListFiltersProps {
  searchQuery: string;
  statusFilter?: CandidateStatus;
  stageFilter?: CandidateStage;
  totalCandidates: number;
  shownCandidates: number;
}

const STATUS_OPTIONS: CandidateStatus[] = ["received", "in_progress", "selected", "discarded"];
const STAGE_OPTIONS: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

export default function CandidateListFilters({
  searchQuery,
  statusFilter,
  stageFilter,
  totalCandidates,
  shownCandidates,
}: CandidateListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [lastSyncedQuery, setLastSyncedQuery] = useState(searchQuery);

  // Resincroniza el input cuando la query cambia desde fuera (navegacion o limpiar filtros).
  if (searchQuery !== lastSyncedQuery) {
    setLastSyncedQuery(searchQuery);
    setSearchInput(searchQuery);
  }

  const updateUrl = useCallback(
    (key: "q" | "status" | "stage", value: string) => {
      const params = new URLSearchParams(currentSearchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      const queryString = params.toString();
      const href = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(href, { scroll: false });
    },
    [currentSearchParams, pathname, router],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      const normalizedValue = searchInput.trim();

      if (normalizedValue !== searchQuery) {
        updateUrl("q", normalizedValue);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, searchQuery, updateUrl]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter || stageFilter);

  const clearFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  return (
    <section className="filter-panel" aria-label="Filtros de candidaturas">
      <div className="filter-header">
        <h2>Filtros</h2>
        <p aria-live="polite">
          Mostrando {shownCandidates} de {totalCandidates} candidaturas
        </p>
      </div>

      <div className="filter-grid">
        <div className="field-group field-search">
          <label htmlFor="candidate-search">Buscar por nombre o correo</label>
          <input
            id="candidate-search"
            name="candidate-search"
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            placeholder="Ej. Ana o ana@correo.com"
          />
        </div>

        <div className="field-group">
          <label htmlFor="status-filter">Filtrar por estado</label>
          <select
            id="status-filter"
            name="status-filter"
            value={statusFilter ?? ""}
            onChange={(event) => {
              updateUrl("status", event.target.value);
            }}
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="stage-filter">Filtrar por etapa</label>
          <select
            id="stage-filter"
            name="stage-filter"
            value={stageFilter ?? ""}
            onChange={(event) => {
              updateUrl("stage", event.target.value);
            }}
          >
            <option value="">Todas las etapas</option>
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {getStageLabel(stage)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className="clear-button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}
