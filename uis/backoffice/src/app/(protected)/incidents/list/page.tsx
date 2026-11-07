"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IncidentRow } from "@/components/IncidentRow";
import {
  ApiError,
  BRANCHES,
  BRANCH_LABELS,
  INCIDENT_ORIGINS,
  INCIDENT_ORIGIN_LABELS,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  listIncidents,
  updateIncidentStatus,
  type Branch,
  type Incident,
  type IncidentOrigin,
  type IncidentStatus,
} from "@/lib/incidentsApi";

// Rows rendered at once. The API returns every incident; rendering them all blocks the main thread on phones.
const PAGE_SIZE = 50;

const LOAD_ERROR = "No se pudieron cargar las incidencias. Comprueba tu conexión e inténtalo de nuevo.";

function statusChangeError(reason: unknown, incident: Incident, status: IncidentStatus): string {
  const restored = `Se ha restaurado el estado anterior (${INCIDENT_STATUS_LABELS[incident.status]}).`;
  if (reason instanceof ApiError && reason.status === 404) return `La incidencia «${incident.title}» ya no existe. Recarga la lista.`;
  if (reason instanceof ApiError && reason.status === 400) {
    return `No se pudo pasar «${incident.title}» a ${INCIDENT_STATUS_LABELS[status].toLowerCase()}: ese cambio ya no es posible desde su estado actual. ${restored} Recarga la lista para ver su estado real.`;
  }
  return `No se pudo cambiar el estado de «${incident.title}». ${restored} Inténtalo de nuevo en unos minutos.`;
}

export default function IncidentListPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [origin, setOrigin] = useState<IncidentOrigin | "">("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set());
  // Only the latest request may update the list, so quick filter changes never show stale rows.
  const latestRequest = useRef(0);
  const filtered = Boolean(status || origin || branch);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    setError("");
    setVisibleCount(PAGE_SIZE);
    try {
      const data = await listIncidents({ status, origin, branch });
      if (request === latestRequest.current) setIncidents(data);
    } catch {
      if (request === latestRequest.current) {
        setIncidents([]);
        setError(LOAD_ERROR);
      }
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [status, origin, branch]);

  useEffect(() => {
    // Fetching on filter changes is the point of this effect; load() flags "loading" first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function replace(updated: Incident) {
    setIncidents((current) => current.map((incident) => (incident.id === updated.id ? updated : incident)));
  }

  function setRowPending(id: number, value: boolean) {
    setPending((current) => {
      const next = new Set(current);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Optimistic update: show the new status at once and roll back if the API refuses it.
  async function changeStatus(incident: Incident, next: IncidentStatus) {
    setNotice("");
    replace({ ...incident, status: next, next_statuses: [] });
    setRowPending(incident.id, true);
    try {
      replace(await updateIncidentStatus(incident.id, next));
    } catch (reason) {
      replace(incident);
      setNotice(statusChangeError(reason, incident, next));
    } finally {
      setRowPending(incident.id, false);
    }
  }

  function clearFilters() {
    setStatus("");
    setOrigin("");
    setBranch("");
  }

  return (
    <main className="wide">
      <div className="page-header">
        <div>
          <h1>Incidencias</h1>
          <p className="muted">Todas las incidencias registradas en Nexova, de la más reciente a la más antigua.</p>
        </div>
        <Link className="button" href="/incidents/new">+ Registrar incidencia</Link>
      </div>

      <section className="card filters" aria-label="Filtros">
        <label>
          Estado
          <select value={status} onChange={(event) => setStatus(event.target.value as IncidentStatus | "")}>
            <option value="">Todos</option>
            {INCIDENT_STATUSES.map((value) => <option key={value} value={value}>{INCIDENT_STATUS_LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          Origen
          <select value={origin} onChange={(event) => setOrigin(event.target.value as IncidentOrigin | "")}>
            <option value="">Todos</option>
            {INCIDENT_ORIGINS.map((value) => <option key={value} value={value}>{INCIDENT_ORIGIN_LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          Sede
          <select value={branch} onChange={(event) => setBranch(event.target.value as Branch | "")}>
            <option value="">Todas</option>
            {BRANCHES.map((value) => <option key={value} value={value}>{BRANCH_LABELS[value]}</option>)}
          </select>
        </label>
        {filtered && <button type="button" className="secondary" onClick={clearFilters}>Quitar filtros</button>}
      </section>

      <div aria-live="polite">
        {notice && (
          <div className="notice" role="alert">
            <p>{notice}</p>
            <button type="button" className="link small" onClick={() => setNotice("")}>Cerrar</button>
          </div>
        )}
      </div>

      <section className="card" aria-busy={loading}>
        {loading ? (
          <p className="state muted"><span className="spinner" aria-hidden="true" />Cargando incidencias…</p>
        ) : error ? (
          <div className="state" role="alert">
            <p className="error">{error}</p>
            <button type="button" onClick={load}>Reintentar</button>
          </div>
        ) : incidents.length === 0 ? (
          filtered ? (
            <div className="state">
              <p className="muted">Ninguna incidencia coincide con estos filtros.</p>
              <button type="button" className="secondary" onClick={clearFilters}>Quitar filtros</button>
            </div>
          ) : (
            <div className="state">
              <p className="muted">Todavía no hay incidencias registradas.</p>
              <Link className="button" href="/incidents/new">Registrar la primera</Link>
            </div>
          )
        ) : (
          <>
            <p className="muted small">
              {incidents.length === 1 ? "1 incidencia" : `${incidents.length} incidencias`}
              {incidents.length > visibleCount && ` · mostrando ${visibleCount}`}
            </p>
            <table className="incidents">
              <thead>
                <tr>
                  <th>Incidencia</th>
                  <th>Categoría</th>
                  <th>Origen</th>
                  <th>Sede</th>
                  <th>Estado</th>
                  <th>Registrada</th>
                  <th>Cambiar estado</th>
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, visibleCount).map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} pending={pending.has(incident.id)} onChangeStatus={changeStatus} />
                ))}
              </tbody>
            </table>
            {incidents.length > visibleCount && (
              <div className="state">
                <button type="button" className="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                  Mostrar más ({incidents.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
