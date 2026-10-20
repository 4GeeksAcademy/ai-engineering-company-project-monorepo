
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import IncidentForm from "./IncidentForm";
import {
  fetchIncidents,
  fetchIncidentSummary,
  updateIncidentStatus,
} from "./api";
import {
  BRANCHES,
  CATEGORIES,
  ORIGINS,
  STATUSES,
  type Incident,
  type IncidentBranch,
  type IncidentCategory,
  type IncidentOrigin,
  type IncidentStatus,
  type IncidentSummary,
} from "./types";

const panelStyle: CSSProperties = {
  background: "white",
  padding: 22,
  borderRadius: 14,
  border: "1px solid #e5dcd5",
  marginBottom: 24,
};

const selectStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #cbbfb5",
  background: "white",
};

const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

function MetricCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <div style={panelStyle}>
      <h3>{title}</h3>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "5px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <span>{item.label}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "">("");
  const [originFilter, setOriginFilter] = useState<IncidentOrigin | "">("");
  const [branchFilter, setBranchFilter] = useState<IncidentBranch | "">("");
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategory | "">("");

  const [refresh, setRefresh] = useState(0);
  const [summaryRefresh, setSummaryRefresh] = useState(0);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    fetchIncidents({
      ...(statusFilter && { status: statusFilter }),
      ...(originFilter && { origin: originFilter }),
      ...(branchFilter && { branch: branchFilter }),
      ...(categoryFilter && { category: categoryFilter }),
    })
      .then((data) => {
        if (active) setIncidents(data);
      })
      .catch(() => {
        if (active) {
          setError("No se pudieron cargar las incidencias.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    statusFilter,
    originFilter,
    branchFilter,
    categoryFilter,
    refresh,
  ]);

  useEffect(() => {
    let active = true;

    fetchIncidentSummary()
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) {
          setSummaryError("No se pudieron cargar las estadísticas.");
        }
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [summaryRefresh]);

  function changeFilter(change: () => void) {
    setLoading(true);
    setError("");
    change();
  }

  function reloadIncidents() {
    setLoading(true);
    setError("");
    setRefresh((n) => n + 1);
  }

  function reloadSummary() {
    setSummaryLoading(true);
    setSummaryError("");
    setSummaryRefresh((n) => n + 1);
  }

  function handleCreated(created: Incident) {
    setNotice(`Incidencia #${created.id} registrada correctamente.`);
    reloadIncidents();
    reloadSummary();
  }

  async function handleStatus(
    incident: Incident,
    nextStatus: IncidentStatus
  ) {
    if (savingId !== null || nextStatus === incident.status) return;

    const previousStatus = incident.status;

    setSavingId(incident.id);
    setNotice("");

    setIncidents((current) =>
      current.map((item) =>
        item.id === incident.id
          ? { ...item, status: nextStatus }
          : item
      )
    );

    try {
      const updated = await updateIncidentStatus(
        incident.id,
        nextStatus
      );

      setIncidents((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setNotice("Estado actualizado correctamente.");
      reloadSummary();

      if (statusFilter && nextStatus !== statusFilter) {
        reloadIncidents();
      }
    } catch {
      setIncidents((current) =>
        current.map((item) =>
          item.id === incident.id
            ? { ...item, status: previousStatus }
            : item
        )
      );

      setNotice(
        "No se pudo actualizar el estado. Se ha restaurado el anterior."
      );
    } finally {
      setSavingId(null);
    }
  }

  const metricGroups = summary
    ? [
        {
          title: "Por estado",
          items: Object.entries(STATUSES).map(([key, label]) => ({
            label,
            count: summary.by_status[key as IncidentStatus] ?? 0,
          })),
        },
        {
          title: "Por categoría",
          items: Object.entries(CATEGORIES).map(([key, label]) => ({
            label,
            count: summary.by_category[key as IncidentCategory] ?? 0,
          })),
        },
        {
          title: "Por origen",
          items: Object.entries(ORIGINS).map(([key, label]) => ({
            label,
            count: summary.by_origin[key as IncidentOrigin] ?? 0,
          })),
        },
        {
          title: "Por sede",
          items: Object.entries(BRANCHES).map(([key, label]) => ({
            label,
            count: summary.by_branch[key as IncidentBranch] ?? 0,
          })),
        },
      ]
    : [];

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <p>Brasaland · Operaciones</p>
        <h1>Gestor de Incidencias Centralizado</h1>
        <p>
          Registra incidencias, consulta su estado y supervisa
          los restaurantes.
        </p>
        <a href="/suppliers">Ir a proveedores</a>
      </header>

      {notice && (
        <p
          role="status"
          style={{
            padding: 14,
            background: "#fff3e6",
            borderRadius: 8,
          }}
        >
          {notice}
        </p>
      )}

      <IncidentForm onCreated={handleCreated} />

      <section style={panelStyle}>
        <h2>Panel de resumen</h2>

        {summaryLoading && <p>Cargando estadísticas...</p>}

        {summaryError && (
          <div role="alert">
            <p>{summaryError}</p>
            <button
              onClick={() => reloadSummary()}
            >
              Reintentar
            </button>
          </div>
        )}

        {!summaryLoading && !summaryError && summary && (
          <>
            <h2 style={{ fontSize: 32 }}>
              {summary.total} incidencias registradas
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 16,
              }}
            >
              {metricGroups.map((group) => (
                <MetricCard
                  key={group.title}
                  title={group.title}
                  items={group.items}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section style={panelStyle}>
        <h2>Listado de incidencias</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <label>
            Estado
            <select
              style={selectStyle}
              value={statusFilter}
              onChange={(e) =>
                changeFilter(() => setStatusFilter(e.target.value as IncidentStatus | ""))
              }
            >
              <option value="">Todos</option>
              {Object.entries(STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Origen
            <select
              style={selectStyle}
              value={originFilter}
              onChange={(e) =>
                changeFilter(() => setOriginFilter(e.target.value as IncidentOrigin | ""))
              }
            >
              <option value="">Todos</option>
              {Object.entries(ORIGINS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sede
            <select
              style={selectStyle}
              value={branchFilter}
              onChange={(e) =>
                changeFilter(() => setBranchFilter(e.target.value as IncidentBranch | ""))
              }
            >
              <option value="">Todas</option>
              {Object.entries(BRANCHES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Categoría
            <select
              style={selectStyle}
              value={categoryFilter}
              onChange={(e) =>
                changeFilter(() => setCategoryFilter(e.target.value as IncidentCategory | ""))
              }
            >
              <option value="">Todas</option>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <p>Cargando incidencias...</p>}

        {error && (
          <div role="alert">
            <p>{error}</p>
            <button onClick={() => reloadIncidents()}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <p>
            No hay incidencias para mostrar con los filtros
            seleccionados.
          </p>
        )}

        {!loading && !error && incidents.length > 0 && (
          <>
            <p>Mostrando {incidents.length} incidencias</p>

            <div style={{ display: "grid", gap: 12 }}>
              {incidents.map((incident) => (
                <article
                  key={incident.id}
                  style={{
                    padding: 18,
                    border: "1px solid #e5dcd5",
                    borderRadius: 10,
                    background: "#fffaf7",
                  }}
                >
                  <h3>
                    #{incident.id} · {incident.title}
                  </h3>

                  <p>{incident.description}</p>

                  <p>
                    <strong>Categoría:</strong>{" "}
                    {CATEGORIES[incident.category]}
                  </p>

                  <p>
                    <strong>Origen:</strong>{" "}
                    {ORIGINS[incident.origin]}
                  </p>

                  <p>
                    <strong>Sede:</strong>{" "}
                    {BRANCHES[incident.branch]}
                  </p>

                  <p>
                    <strong>Creada:</strong>{" "}
                    {new Date(incident.created_at).toLocaleString("es-ES")}
                  </p>

                  <label>
                    <strong>Estado: </strong>
                    <select
                      style={{ ...selectStyle, maxWidth: 240 }}
                      value={incident.status}
                      disabled={
                        savingId !== null ||
                        transitions[incident.status].length === 0
                      }
                      onChange={(e) =>
                        handleStatus(
                          incident,
                          e.target.value as IncidentStatus
                        )
                      }
                    >
                      <option value={incident.status}>
                        {STATUSES[incident.status]}
                      </option>

                      {transitions[incident.status].map((status) => (
                        <option key={status} value={status}>
                          {STATUSES[status]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {savingId === incident.id && (
                    <p>Actualizando estado...</p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
