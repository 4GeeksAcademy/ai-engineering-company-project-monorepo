"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import {
  EMPTY_FILTERS,
  type Incident,
  type IncidentFacets,
  type IncidentFilters,
  type IncidentPage,
  type IncidentSummary,
} from "@repo/shared-types";
import IncidentFiltersBar from "../components/incidents/IncidentFilters";
import IncidentForm from "../components/incidents/IncidentForm";
import IncidentSummaryPanel from "../components/incidents/IncidentSummaryPanel";
import IncidentTable from "../components/incidents/IncidentTable";
import { ErrorBanner } from "../components/incidents/Field";
import {
  getIncidentFacets,
  getIncidentSummary,
  listIncidents,
  type SortField,
  type SortOrder,
} from "../lib/api";
import { describeError } from "../lib/errors";
import { useDebounced } from "../lib/useDebounced";

const PAGE_SIZE = 15;

export default function IncidentsPage() {
  const [filters, setFilters] = useState<IncidentFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortField>("created_at");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [list, setList] = useState<IncidentPage | null>(null);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [facets, setFacets] = useState<IncidentFacets>({ branches: [], clients: [], agents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Typing in the search box must not fire a request per keystroke.
  const applied = useDebounced(filters, 300);
  const rangeInvalid = !!applied.date_from && !!applied.date_to && applied.date_from > applied.date_to;
  const hasFilters = JSON.stringify(applied) !== JSON.stringify(EMPTY_FILTERS);

  // Only the latest request may write state: a slow older answer must not overwrite a newer one.
  const latest = useRef(0);

  useEffect(() => {
    if (rangeInvalid) return;
    const request = ++latest.current;
    setLoading(true);
    Promise.all([listIncidents(applied, { sort, order, page, pageSize: PAGE_SIZE }), getIncidentSummary(applied)])
      .then(([nextList, nextSummary]) => {
        if (request !== latest.current) return;
        setList(nextList);
        setSummary(nextSummary);
        setError(null);
        // A page that no longer exists (e.g. after filtering) falls back to the last one.
        if (nextList.pages > 0 && page > nextList.pages) setPage(nextList.pages);
      })
      .catch((err) => request === latest.current && setError(describeError(err, "No se pudieron cargar las incidencias.")))
      .finally(() => request === latest.current && setLoading(false));
  }, [applied, sort, order, page, reloadKey, rangeInvalid]);

  useEffect(() => {
    getIncidentFacets().then(setFacets).catch(() => undefined); // only fills dropdowns; the list reports real errors
  }, [reloadKey]);

  const changeFilters = useCallback((next: IncidentFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handleSort = (field: SortField) => {
    if (field === sort) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(field);
      setOrder(field === "id" ? "asc" : "desc");
    }
    setPage(1);
  };

  const handleCreated = (incident: Incident) => {
    setShowForm(false);
    setNotice(`Incidencia ${incident.id} creada.`);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const pages = list?.pages ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Incidencias</h1>
          <p className="mt-2 text-slate-400">Gestión centralizada de las incidencias de clientes, sucursales y equipos internos de Nexova.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setNotice(null);
          }}
          className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <Plus size={16} />
          Nueva incidencia
        </button>
      </header>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {showForm && (
        <div className="mt-6">
          <IncidentForm branches={facets.branches} agents={facets.agents} clients={facets.clients} onSaved={handleCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="mt-8">{summary ? <IncidentSummaryPanel summary={summary} /> : null}</div>

      <div className="mt-8">
        <IncidentFiltersBar filters={filters} facets={facets} onChange={changeFilters} />
      </div>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mt-6" aria-busy={loading}>
        {list === null && loading ? (
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="animate-spin" size={20} />
            Cargando…
          </div>
        ) : list && list.total === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-10 text-center text-sm text-slate-400">
            {hasFilters
              ? "Ninguna incidencia coincide con estos filtros."
              : "Todavía no hay incidencias. Crea la primera o carga el histórico con «scripts/seed_incidents.py»."}
          </p>
        ) : list ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <IncidentTable items={list.items} sort={sort} order={order} onSort={handleSort} />
            <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <p>
                {list.total} incidencias · página {list.page} de {pages}
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 enabled:hover:text-white disabled:opacity-40">
                  <ChevronLeft size={14} /> Anterior
                </button>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 enabled:hover:text-white disabled:opacity-40">
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </div>
  );
}
