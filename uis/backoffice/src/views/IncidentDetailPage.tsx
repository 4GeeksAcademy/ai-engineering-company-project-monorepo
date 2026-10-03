"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { BRANCH_LABELS, CATEGORY_LABELS, ORIGIN_LABELS, SCORE_LABELS, type Incident, type IncidentFacets } from "@repo/shared-types";
import { ErrorBanner } from "../components/incidents/Field";
import HistoryTimeline from "../components/incidents/HistoryTimeline";
import IncidentForm from "../components/incidents/IncidentForm";
import StatusActions from "../components/incidents/StatusActions";
import StatusBadge from "../components/incidents/StatusBadge";
import { getIncident, getIncidentFacets } from "../lib/api";
import { describeError, isNotFound } from "../lib/errors";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [facets, setFacets] = useState<IncidentFacets>({ branches: [], clients: [], agents: [] });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return getIncident(incidentId)
      .then((loaded) => {
        setIncident(loaded);
        setNotFound(false);
        setError(null);
      })
      .catch((err) => {
        if (isNotFound(err)) setNotFound(true);
        else setError(describeError(err, "No se pudo cargar la incidencia."));
      })
      .finally(() => setLoading(false));
  }, [incidentId]);

  useEffect(() => {
    load();
    getIncidentFacets().then(setFacets).catch(() => undefined);
  }, [load]);

  const back = (
    <Link href="/incidents" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
      <ArrowLeft size={16} />
      Volver a incidencias
    </Link>
  );

  if (loading && !incident) {
    return (
      <div className="mx-auto max-w-4xl flex items-center gap-3 text-slate-300">
        <Loader2 className="animate-spin" size={20} />
        Cargando…
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl">
        {back}
        <h1 className="mt-6 text-2xl font-bold text-white">Incidencia no encontrada</h1>
        <p className="mt-2 text-slate-400">No existe ninguna incidencia con el identificador {incidentId}.</p>
      </div>
    );
  }
  if (!incident) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        {back}
        {error && <ErrorBanner message={error} />}
        <button type="button" onClick={load} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:text-white">
          Reintentar
        </button>
      </div>
    );
  }

  const handleSaved = (updated: Incident, message: string) => {
    setIncident(updated);
    setEditing(false);
    setError(null);
    setNotice(message);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            {incident.id}
            <StatusBadge status={incident.status} />
          </h1>
          <p className="mt-2 text-lg text-slate-300">{incident.title}</p>
        </div>
        {incident.editable && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:text-white">
            <Pencil size={14} />
            Editar
          </button>
        )}
      </header>

      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}
      {error && <ErrorBanner message={error} />}
      {!incident.editable && (
        <p className="text-sm text-slate-500">Las incidencias resueltas o descartadas son finales: no se pueden editar.</p>
      )}

      {editing ? (
        <IncidentForm
          incident={incident}
          agents={facets.agents}
          clients={facets.clients}
          onSaved={(updated) => handleSaved(updated, "Cambios guardados.")}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Creada">{new Date(incident.created_at).toLocaleString("es-ES")}</Detail>
            <Detail label="Última modificación">{new Date(incident.updated_at).toLocaleString("es-ES")}</Detail>
            <Detail label="Categoría">{CATEGORY_LABELS[incident.category]}</Detail>
            <Detail label="Origen">{ORIGIN_LABELS[incident.origin]}</Detail>
            <Detail label="Oficina">{BRANCH_LABELS[incident.branch]}</Detail>
            <Detail label="Empresa cliente">{incident.client_company ?? "—"}</Detail>
            <Detail label="Agente">{incident.agent_id ?? "—"}</Detail>
            <Detail label="Email del cliente">{incident.customer_email ?? "—"}</Detail>
            <div className="sm:col-span-2">
              <Detail label="Descripción">{incident.description}</Detail>
            </div>
            {incident.satisfaction_score !== null && (
              <Detail label="Satisfacción">
                {incident.satisfaction_score} / 5 · {SCORE_LABELS[incident.satisfaction_score]}
              </Detail>
            )}
            {incident.discard_reason && <Detail label="Motivo del descarte">{incident.discard_reason}</Detail>}
          </dl>
        </section>
      )}

      <StatusActions
        incident={incident}
        onChanged={(updated) => handleSaved(updated, "Estado actualizado.")}
        onConflict={() => {
          setEditing(false);
          load().then(() => setError("La incidencia había cambiado de estado; mostramos los datos actuales."));
        }}
      />
      <HistoryTimeline history={incident.history} />
    </div>
  );
}
