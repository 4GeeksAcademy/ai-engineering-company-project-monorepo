"use client";

import { useMemo } from "react";
import {
  BRANCH_LABELS,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_ORIGIN_LABELS,
  INCIDENT_STATUS_DESCRIPTIONS,
  INCIDENT_STATUS_LABELS,
  STATUS_ACTION_LABELS,
  formatIncidentDate,
  type Incident,
  type IncidentStatus,
} from "@/lib/incidentsApi";

type Props = {
  incident: Incident;
  /** True while a status change for this row is being saved. */
  pending: boolean;
  onChangeStatus: (incident: Incident, status: IncidentStatus) => void;
};

const DESCRIPTION_PREVIEW = 140;

export function IncidentRow({ incident, pending, onChangeStatus }: Props) {
  const preview =
    incident.description.length > DESCRIPTION_PREVIEW ? `${incident.description.slice(0, DESCRIPTION_PREVIEW)}…` : incident.description;
  // Intl.DateTimeFormat is built on every call (~0.06 ms; 3 ms for a 50-row page) and every status
  // change re-renders all rows. Only created_at can change the result, so unchanged rows skip it.
  const created = useMemo(() => formatIncidentDate(incident.created_at), [incident.created_at]);
  return (
    <tr className={pending ? "pending" : undefined} aria-busy={pending}>
      <td>
        <strong>{incident.title}</strong>
        {preview !== incident.title && <div className="muted small">{preview}</div>}
      </td>
      <td>{INCIDENT_CATEGORY_LABELS[incident.category]}</td>
      <td>{INCIDENT_ORIGIN_LABELS[incident.origin]}</td>
      <td>{BRANCH_LABELS[incident.branch]}</td>
      <td>
        <span className={`badge ${incident.status}`} title={INCIDENT_STATUS_DESCRIPTIONS[incident.status]}>
          {INCIDENT_STATUS_LABELS[incident.status]}
        </span>
      </td>
      <td className="small">{created}</td>
      <td>
        {pending ? (
          <span className="small muted"><span className="spinner" aria-hidden="true" />Guardando…</span>
        ) : incident.next_statuses.length > 0 ? (
          <div className="status-actions">
            {incident.next_statuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`small ${status === "discarded" ? "secondary" : ""}`}
                onClick={() => onChangeStatus(incident, status)}
                aria-label={`${STATUS_ACTION_LABELS[status]}: ${incident.title}`}
              >
                {STATUS_ACTION_LABELS[status]}
              </button>
            ))}
          </div>
        ) : (
          <span className="small muted">Estado final</span>
        )}
      </td>
    </tr>
  );
}
