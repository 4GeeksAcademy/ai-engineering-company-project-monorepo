// components/incident-list.tsx — Lista de incidencias con filtros y cambio de estado
//
// Muestra todas las incidencias del sistema en una tabla responsive.
// Incluye filtros por estado, categoría y sede, además de acciones
// para cambiar el estado de cada incidencia.
//
// Checklist:
//   #26: 3 estados (cargando, vacío, con datos)
//   #27: Error con opción de reintentar
//   #28: Sin resultados -> mensaje informativo
//   #29: Cambio de estado revierte visualmente si falla

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchIncidents,
  updateIncidentStatus,
  VALID_STATUSES,
  VALID_CATEGORIES,
  getAllowedTransitions,
} from "@/lib/incident-actions";
import type { Incident } from "@/lib/incident-actions";

const VALID_BRANCHES = [
  { value: "", label: "Todas" },
  { value: "central", label: "Central" },
  { value: "la_warehouse", label: "LA Warehouse" },
  { value: "la_office", label: "LA Office" },
  { value: "zaragoza_warehouse", label: "Zaragoza Warehouse" },
  { value: "zaragoza_office", label: "Zaragoza Office" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En progreso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  discarded: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function IncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionMsgType, setActionMsgType] = useState<"success" | "error">("success");

  // Filtros
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBranch, setFilterBranch] = useState("");

  // Modal de cambio de estado
  const [statusModal, setStatusModal] = useState<{
    incident: Incident;
    allowedTransitions: string[];
  } | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIncidents({
        status: filterStatus || undefined,
        category: filterCategory || undefined,
        branch: filterBranch || undefined,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setIncidents(data);
    } catch (err: any) {
      setError(err?.detail?.detail ?? err?.detail ?? err?.message ?? "Error al cargar incidencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [filterStatus, filterCategory, filterBranch]);

  const handleOpenStatusModal = (incident: Incident) => {
    const transitions = getAllowedTransitions(incident.status);
    if (transitions.length === 0) {
      setActionMsgType("error");
      setActionMsg(`La incidencia #${incident.id} está en estado final "${STATUS_LABELS[incident.status] ?? incident.status}". No se permite cambiar su estado.`);
      setTimeout(() => setActionMsg(null), 4000);
      return;
    }
    setStatusModal({ incident, allowedTransitions: transitions });
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!statusModal) return;
    setUpdating(true);
    setActionMsg(null);

    // Optimistic update: apply change immediately
    const previousIncidents = [...incidents];
    const prevStatus = statusModal.incident.status;
    statusModal.incident.status = newStatus;
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === statusModal.incident.id ? { ...inc, status: newStatus } : inc
      )
    );
    setStatusModal(null);

    try {
      await updateIncidentStatus(statusModal.incident.id, newStatus);
      setActionMsgType("success");
      setActionMsg(`Incidencia #${statusModal.incident.id} actualizada a "${STATUS_LABELS[newStatus] ?? newStatus}".`);
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      // Revert visual change on failure (Checklist #29)
      setIncidents(previousIncidents);
      statusModal.incident.status = prevStatus;
      setActionMsgType("error");
      setActionMsg(err?.detail?.detail ?? err?.detail ?? err?.message ?? "Error al actualizar estado. Se ha revertido el cambio.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensajes de acción */}
      {actionMsg && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            actionMsgType === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-indigo-200 bg-indigo-50 text-indigo-900"
          }`}
        >
          {actionMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Todos</option>
            {VALID_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Categoría</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Todas</option>
            {VALID_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Sede</label>
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {VALID_BRANCHES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Link
            href="/incidents/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Nueva incidencia
          </Link>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Cargando incidencias...</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-900">{error}</p>
          <button
            onClick={loadIncidents}
            className="mt-3 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            Reintentar
          </button>
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
          No hay incidencias que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3">Creada</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.map((inc) => (
                <tr key={inc.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">#{inc.id}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-700">{inc.title}</td>
                  <td className="px-4 py-3 text-slate-600">{inc.category.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[inc.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATUS_LABELS[inc.status] ?? inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inc.branch.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(inc.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleOpenStatusModal(inc)}
                      disabled={updating}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cambiar estado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de cambio de estado */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Incidencia #{statusModal.incident.id}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Estado actual:{" "}
              <span className="font-medium">{STATUS_LABELS[statusModal.incident.status] ?? statusModal.incident.status}</span>
            </p>
            <p className="mt-4 text-sm font-medium text-slate-700">Selecciona el nuevo estado:</p>
            <div className="mt-3 flex flex-col gap-2">
              {statusModal.allowedTransitions.map((st) => (
                <button
                  key={st}
                  disabled={updating}
                  onClick={() => handleChangeStatus(st)}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {STATUS_LABELS[st] ?? st}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStatusModal(null)}
              className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}