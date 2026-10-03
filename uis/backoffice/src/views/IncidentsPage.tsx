"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import {
  EMPTY_FILTERS,
  STATUS_LABELS,
  type IncidentFacets,
  type IncidentFilters,
  type IncidentListItem,
  type IncidentPage,
  type IncidentStatus,
} from "@repo/shared-types";
import IncidentFiltersBar from "../components/incidents/IncidentFilters";
import SummarySection from "../components/incidents/SummarySection";
import IncidentTable from "../components/incidents/IncidentTable";
import { ErrorBanner } from "../components/incidents/Field";
import {
  changeIncidentStatus,
  getIncidentFacets,
  listIncidents,
  type SortField,
  type SortOrder,
} from "../lib/api";
import { describeError, isConflict } from "../lib/errors";

const PAGE_SIZE = 15;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function IncidentsPage() {
  const [filters, setFilters] = useState<IncidentFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortField>("created_at");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  const [list, setList] = useState<IncidentPage | null>(null);
  const [summaryVersion, setSummaryVersion] = useState(0); // bump to reload the summary cards
  const [facets, setFacets] = useState<IncidentFacets>({ branches: [], clients: [], agents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Status changes made from the list: the new status is shown at once and undone if the server refuses it.
  const [saving, setSaving] = useState<Record<string, IncidentStatus>>({});
  const [statusFailure, setStatusFailure] = useState<{ id: string; message: string } | null>(null);

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
    listIncidents(applied, { sort, order, page, pageSize: PAGE_SIZE })
      .then((nextList) => {
        if (request !== latest.current) return;
        setList(nextList);
        setError(null);
        // A page that no longer exists (e.g. after filtering) falls back to the last one.
        if (nextList.pages > 0 && page > nextList.pages) setPage(nextList.pages);
      })
      .catch((err) => request === latest.current && setError(describeError(err, "No se pudieron cargar las incidencias.")))
      .finally(() => request === latest.current && setLoading(false));
  }, [applied, sort, order, page, rangeInvalid, reloadKey]);

  useEffect(() => {
    getIncidentFacets().then(setFacets).catch(() => undefined); // only fills dropdowns; the list reports real errors
  }, []);

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

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const replaceItem = (id: string, change: (item: IncidentListItem) => IncidentListItem) =>
    setList((current) => (current ? { ...current, items: current.items.map((item) => (item.id === id ? change(item) : item)) } : current));

  const handleChangeStatus = async (item: IncidentListItem, target: IncidentStatus) => {
    if (saving[item.id]) return;
    const before = item; // what to go back to
    setStatusFailure(null);
    setSaving((current) => ({ ...current, [item.id]: target }));
    replaceItem(item.id, (row) => ({ ...row, status: target, allowed_transitions: [], editable: false })); // optimistic
    try {
      const saved = await changeIncidentStatus(item.id, { status: target });
      replaceItem(item.id, (row) => ({
        ...row,
        status: saved.status,
        satisfaction_score: saved.satisfaction_score,
        discard_reason: saved.discard_reason,
        updated_at: saved.updated_at,
        allowed_transitions: saved.allowed_transitions,
        editable: saved.editable,
      }));
      setSummaryVersion((v) => v + 1); // the totals follow the change
    } catch (err) {
      replaceItem(item.id, () => before); // undo
      const why = describeError(err, "No se pudo cambiar el estado.");
      setStatusFailure({
        id: item.id,
        message: `No se pudo pasar ${item.id} a «${STATUS_LABELS[target]}»: ${why} Se ha restaurado su estado anterior (${STATUS_LABELS[before.status]}).`,
      });
      if (isConflict(err)) reload(); // someone else changed it: show the real state
    } finally {
      setSaving((current) => {
        const { [item.id]: _done, ...rest } = current;
        return rest;
      });
    }
  };

  const pages = list?.pages ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Panel de incidencias</h1>
          <p className="mt-2 text-slate-400">Gestión centralizada de las incidencias de clientes, oficinas y equipos internos de Nexova.</p>
        </div>
        <Link
          href="/incidents/new"
          className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <Plus size={16} />
          Nueva incidencia
        </Link>
      </header>

      <div className="mt-8">
        <SummarySection filters={applied} refreshKey={summaryVersion + reloadKey} paused={rangeInvalid} />
      </div>

      <div className="mt-8">
        <IncidentFiltersBar filters={filters} facets={facets} onChange={changeFilters} />
      </div>

      {statusFailure && (
        <div className="mt-6">
          <ErrorBanner message={statusFailure.message} onDismiss={() => setStatusFailure(null)} />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={reload} retrying={loading} />
        </div>
      )}

      <div className="mt-6" aria-busy={loading}>
        {loading && (
          <p role="status" className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="animate-spin text-cyan-300" size={16} aria-hidden="true" />
            {list === null ? "Cargando incidencias…" : "Actualizando…"}
          </p>
        )}
        {list === null ? null : list.total === 0 ? (
          <div className={`rounded-2xl border border-slate-800 bg-slate-900 px-4 py-10 text-center text-sm text-slate-400 ${loading ? "opacity-60" : ""}`}>
            {hasFilters ? (
              <>
                <p>Ninguna incidencia coincide con estos filtros.</p>
                <button
                  type="button"
                  onClick={() => changeFilters(EMPTY_FILTERS)}
                  className="mt-3 rounded-full border border-slate-700 px-4 py-1.5 text-slate-200 hover:text-white"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <p>Todavía no hay incidencias registradas.</p>
                <p className="mt-1 text-xs text-slate-500">También puedes cargar el histórico con «scripts/seed_incidents.py».</p>
                <Link href="/incidents/new" className="mt-3 inline-block rounded-full bg-cyan-400 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-300">
                  Registrar la primera incidencia
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <IncidentTable
              items={list.items}
              sort={sort}
              order={order}
              onSort={handleSort}
              saving={saving}
              failedId={statusFailure?.id ?? null}
              onChangeStatus={handleChangeStatus}
            />
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
        )}
      </div>
    </div>
  );
}
