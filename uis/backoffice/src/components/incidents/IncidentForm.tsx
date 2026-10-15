import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  CATEGORY_LABELS,
  DEFAULT_BRANCH,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  LIMITS,
  ORIGIN_LABELS,
  validateIncidentDraft,
  type FieldErrors,
  type Incident,
  type IncidentDraft,
} from "@repo/shared-types";
import { ApiError, createIncident, updateIncident, type IncidentFields } from "../../lib/api";
import { describeError } from "../../lib/errors";
import { ErrorBanner, Field, inputClass } from "./Field";

interface Props {
  /** Present = edit that incident (only the fields that changed are sent); absent = report a new one. */
  incident?: Incident;
  branches: string[];
  agents: string[];
  clients: string[];
  onSaved: (incident: Incident) => void;
  onCancel: () => void;
}

const FIELDS: (keyof IncidentDraft)[] = [
  "title",
  "description",
  "category",
  "origin",
  "branch",
  "client_company",
  "agent_id",
  "customer_email",
];
const OPTIONAL: (keyof IncidentDraft)[] = ["client_company", "agent_id", "customer_email"];

export default function IncidentForm({ incident, branches, agents, clients, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<IncidentDraft>({
    title: incident?.title ?? "",
    description: incident?.description ?? "",
    category: incident?.category ?? "",
    origin: incident?.origin ?? "customer",
    branch: incident?.branch ?? DEFAULT_BRANCH,
    client_company: incident?.client_company ?? "",
    agent_id: incident?.agent_id ?? "",
    customer_email: incident?.customer_email ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors<keyof IncidentDraft>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof IncidentDraft) => (value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // origin and branch are validated together
    const stale = key === "origin" || key === "branch" ? ["origin", "branch"] : [key];
    if (stale.some((k) => errors[k as keyof IncidentDraft]))
      setErrors((prev) => ({ ...prev, ...Object.fromEntries(stale.map((k) => [k, undefined])) }));
  };
  const props = (key: keyof IncidentDraft) => ({
    id: `incident-${key}`,
    value: draft[key],
    onChange: (e: { target: { value: string } }) => set(key)(e.target.value),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `incident-${key}-error` : undefined,
    className: inputClass,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validateIncidentDraft(draft);
    setErrors(found);
    const firstInvalid = FIELDS.find((key) => found[key]);
    if (firstInvalid) {
      document.getElementById(`incident-${firstInvalid}`)?.focus();
      return;
    }
    const clean = Object.fromEntries(FIELDS.map((key) => [key, draft[key].trim()])) as unknown as IncidentDraft;
    setSaving(true);
    try {
      if (incident) {
        // Only what changed; an optional field that was emptied is cleared with null.
        const changes: Partial<IncidentFields> = {};
        for (const key of FIELDS) {
          const before = (incident[key] ?? "") as string;
          if (clean[key] !== before) Object.assign(changes, { [key]: OPTIONAL.includes(key) && !clean[key] ? null : clean[key] });
        }
        if (Object.keys(changes).length === 0) {
          setFormError("No has cambiado ningún dato.");
          return;
        }
        onSaved(await updateIncident(incident.id, changes));
      } else {
        const payload = Object.fromEntries(FIELDS.filter((key) => !OPTIONAL.includes(key) || clean[key]).map((key) => [key, clean[key]]));
        onSaved(await createIncident(payload as IncidentFields));
      }
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).filter(([key]) => FIELDS.includes(key as keyof IncidentDraft))));
      }
      setFormError(describeError(err, incident ? "No se pudo guardar la incidencia." : "No se pudo crear la incidencia."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={incident ? "Editar incidencia" : "Nueva incidencia"} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">{incident ? `Editar ${incident.id}` : "Nueva incidencia"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="incident-title" label="Título" error={errors.title}>
            <input {...props("title")} maxLength={LIMITS.titleMax} autoComplete="off" />
          </Field>
        </div>
        <Field id="incident-category" label="Categoría" error={errors.category}>
          <select {...props("category")}>
            <option value="">Selecciona…</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="incident-origin" label="Origen" error={errors.origin}>
          <select {...props("origin")}>
            {INCIDENT_ORIGINS.map((o) => (
              <option key={o} value={o}>
                {ORIGIN_LABELS[o]}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field id="incident-branch" label="Sucursal" error={errors.branch} hint={`«${DEFAULT_BRANCH}» cuando no aplica una sucursal concreta.`}>
            <input {...props("branch")} list="incident-branches" maxLength={LIMITS.branchMax} autoComplete="off" />
            <datalist id="incident-branches">
              {Array.from(new Set([DEFAULT_BRANCH, ...branches])).map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            id="incident-description"
            label="Descripción"
            error={errors.description}
            hint={`${draft.description.trim().length}/${LIMITS.descriptionMax} caracteres`}
          >
            <textarea {...props("description")} rows={3} maxLength={LIMITS.descriptionMax} />
          </Field>
        </div>
        <Field id="incident-client_company" label="Empresa cliente (opcional)" error={errors.client_company}>
          <input {...props("client_company")} list="incident-clients" maxLength={LIMITS.clientCompanyMax} autoComplete="off" />
          <datalist id="incident-clients">
            {clients.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field id="incident-agent_id" label="Agente (opcional)" error={errors.agent_id} hint="Formato AGT-07">
          <input {...props("agent_id")} list="incident-agents" placeholder="AGT-07" autoComplete="off" />
          <datalist id="incident-agents">
            {agents.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Field>
        <div className="sm:col-span-2">
          <Field id="incident-customer_email" label="Email del cliente (opcional)" error={errors.customer_email} hint="Dato sensible: solo lo ve el equipo de soporte.">
            <input {...props("customer_email")} type="email" autoComplete="off" />
          </Field>
        </div>
      </div>
      {formError && (
        <div className="mt-4">
          <ErrorBanner message={formError} />
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {saving && <Loader2 className="animate-spin" size={14} />}
          {incident ? "Guardar cambios" : "Crear incidencia"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-5 py-2 text-sm text-slate-300 hover:text-white">
          Cancelar
        </button>
      </div>
    </form>
  );
}
