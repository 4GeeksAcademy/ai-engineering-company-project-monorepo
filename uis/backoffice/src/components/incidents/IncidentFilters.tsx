import { X } from "lucide-react";
import {
  BRANCH_LABELS,
  CATEGORY_LABELS,
  EMPTY_FILTERS,
  INCIDENT_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_STATUSES,
  ORIGIN_LABELS,
  STATUS_LABELS,
  type IncidentBranch,
  type IncidentCategory,
  type IncidentFacets,
  type IncidentFilters,
  type IncidentOrigin,
  type IncidentStatus,
} from "@repo/shared-types";
import { inputClass } from "./Field";

interface Props {
  filters: IncidentFilters;
  facets: IncidentFacets;
  onChange: (filters: IncidentFilters) => void;
}

const selectClass = inputClass.replace("w-full", "w-auto");

export default function IncidentFiltersBar({ filters, facets, onChange }: Props) {
  const set = <K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]) => onChange({ ...filters, [key]: value });
  const toggleStatus = (status: IncidentStatus) =>
    set("status", filters.status.includes(status) ? filters.status.filter((s) => s !== status) : [...filters.status, status]);
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const dateOrderInvalid = !!filters.date_from && !!filters.date_to && filters.date_from > filters.date_to;

  return (
    <form role="search" aria-label="Filtros de incidencias" onSubmit={(e) => e.preventDefault()} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Buscar por id, título, cliente u oficina"
          placeholder="Buscar id, título, cliente u oficina…"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
        <select aria-label="Filtrar por categoría" value={filters.category[0] ?? ""} onChange={(e) => set("category", e.target.value ? [e.target.value as IncidentCategory] : [])} className={selectClass}>
          <option value="">Todas las categorías</option>
          {INCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por origen" value={filters.origin[0] ?? ""} onChange={(e) => set("origin", e.target.value ? [e.target.value as IncidentOrigin] : [])} className={selectClass}>
          <option value="">Todos los orígenes</option>
          {INCIDENT_ORIGINS.map((o) => (
            <option key={o} value={o}>
              {ORIGIN_LABELS[o]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por oficina" value={filters.branch} onChange={(e) => set("branch", e.target.value as IncidentBranch | "")} className={selectClass}>
          <option value="">Todas las oficinas</option>
          {INCIDENT_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {BRANCH_LABELS[b]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por cliente" value={filters.client_company} onChange={(e) => set("client_company", e.target.value)} className={selectClass}>
          <option value="">Todos los clientes</option>
          {facets.clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por agente" value={filters.agent_id} onChange={(e) => set("agent_id", e.target.value)} className={selectClass}>
          <option value="">Todos los agentes</option>
          {facets.agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Estado</legend>
          {INCIDENT_STATUSES.map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={filters.status.includes(s)}
              onClick={() => toggleStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filters.status.includes(s) ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Creada desde
          <input type="date" value={filters.date_from} onChange={(e) => set("date_from", e.target.value)} aria-invalid={dateOrderInvalid || undefined} className={selectClass} />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Hasta
          <input type="date" value={filters.date_to} onChange={(e) => set("date_to", e.target.value)} aria-invalid={dateOrderInvalid || undefined} className={selectClass} />
        </label>
        {active && (
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="flex items-center gap-1 text-xs text-slate-300 hover:text-white">
            <X size={14} />
            Limpiar filtros
          </button>
        )}
      </div>
      {dateOrderInvalid && <p role="alert" className="text-xs text-rose-300">La fecha «Desde» no puede ser posterior a «Hasta».</p>}
    </form>
  );
}
