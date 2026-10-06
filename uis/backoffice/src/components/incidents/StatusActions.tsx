import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  LIMITS,
  SCORE_LABELS,
  STATUS_LABELS,
  validateStatusChange,
  type FieldErrors,
  type Incident,
  type IncidentStatus,
} from "@repo/shared-types";
import { ApiError, changeIncidentStatus } from "../../lib/api";
import { describeError, isConflict } from "../../lib/errors";
import { statusActionLabel } from "../../lib/labels";
import { ErrorBanner, inputClass } from "./Field";

interface Props {
  incident: Incident;
  onChanged: (incident: Incident) => void;
  /** The incident changed under us (409): the page reloads it. */
  onConflict: () => void;
}

export default function StatusActions({ incident, onChanged, onConflict }: Props) {
  const [target, setTarget] = useState<IncidentStatus | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"status" | "satisfaction_score" | "discard_reason">>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTarget(null);
    setScore(null);
    setReason("");
    setErrors({});
    setError(null);
  };

  if (incident.allowed_transitions.length === 0) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    const change = {
      status: target,
      satisfaction_score: target === "resolved" ? score : null,
      discard_reason: target === "discarded" ? reason.trim() : null,
    };
    const found = validateStatusChange(incident.status, change);
    setErrors(found);
    setError(found.status ?? null);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const updated = await changeIncidentStatus(incident.id, {
        status: target,
        ...(change.satisfaction_score != null && { satisfaction_score: change.satisfaction_score }),
        ...(change.discard_reason && { discard_reason: change.discard_reason }),
      });
      reset();
      onChanged(updated);
    } catch (err) {
      if (isConflict(err)) {
        reset();
        onConflict();
        return;
      }
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      setError(describeError(err, "No se pudo cambiar el estado."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Cambiar estado" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">Ciclo de vida</h2>
      <p className="mt-1 text-sm text-slate-400">
        Estado actual: <strong className="text-slate-200">{STATUS_LABELS[incident.status]}</strong>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {incident.allowed_transitions.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={target === status}
            onClick={() => {
              reset();
              setTarget(status);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              target === status ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            {statusActionLabel(incident.status, status)}
          </button>
        ))}
      </div>

      {target && (
        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          {target === "resolved" && (
            <fieldset aria-describedby={errors.satisfaction_score ? "score-error" : undefined}>
              <legend className="text-sm text-slate-300">Satisfacción del cliente (opcional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(SCORE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-xs transition focus-within:outline focus-within:outline-2 focus-within:outline-cyan-300 ${
                      score === Number(value) ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <input type="radio" name="score" value={value} checked={score === Number(value)} onChange={() => setScore(Number(value))} onClick={() => score === Number(value) && setScore(null)} className="sr-only" />
                    <span className="block text-base font-semibold">{value}</span>
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Pulsa de nuevo la puntuación elegida para quitarla.</p>
              {errors.satisfaction_score && <p id="score-error" className="mt-2 text-xs text-rose-300">{errors.satisfaction_score}</p>}
            </fieldset>
          )}
          {target === "discarded" && (
            <div className="text-sm text-slate-300">
              <label htmlFor="discard-reason">Motivo del descarte</label>
              <textarea
                id="discard-reason"
                rows={2}
                value={reason}
                maxLength={LIMITS.discardReasonMax}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={errors.discard_reason ? true : undefined}
                aria-describedby={errors.discard_reason ? "reason-error" : undefined}
                className={`${inputClass} mt-1`}
              />
              {errors.discard_reason && <p id="reason-error" className="mt-1 text-xs text-rose-300">{errors.discard_reason}</p>}
            </div>
          )}
          {target === "open" && incident.status !== "in_progress" && (
            <p className="text-sm text-slate-400">
              Al reabrir se borra {incident.status === "resolved" ? "la puntuación de satisfacción" : "el motivo del descarte"} y la incidencia vuelve a poder editarse.
            </p>
          )}
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
              {saving && <Loader2 className="animate-spin" size={14} />}
              Confirmar: {statusActionLabel(incident.status, target).toLowerCase()}
            </button>
            <button type="button" onClick={reset} className="rounded-full px-5 py-2 text-sm text-slate-300 hover:text-white">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
