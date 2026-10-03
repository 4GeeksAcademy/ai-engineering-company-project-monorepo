import { FormEvent, useRef, useState } from "react";
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
import { describeError, friendlyFieldError } from "../../lib/errors";
import { ErrorBanner, Field, inputClass } from "./Field";

interface Props {
  /** Present = edit that incident (only the fields that changed are sent); absent = register a new one. */
  incident?: Incident;
  branches: string[];
  agents: string[];
  clients: string[];
  /** Called with the saved incident. When registering, the form has already been cleared. */
  onSaved: (incident: Incident) => void;
  onCancel?: () => void;
}

/** Same order as on screen: the first one with an error gets the focus. */
const FIELDS: (keyof IncidentDraft)[] = [
  "title",
  "category",
  "origin",
  "branch",
  "description",
  "client_company",
  "agent_id",
  "customer_email",
];
const OPTIONAL: (keyof IncidentDraft)[] = ["client_company", "agent_id", "customer_email"];

const EMPTY: IncidentDraft = {
  title: "",
  description: "",
  category: "",
  origin: "customer",
  branch: DEFAULT_BRANCH,
  client_company: "",
  agent_id: "",
  customer_email: "",
};

export default function IncidentForm({ incident, branches, agents, clients, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<IncidentDraft>(
    incident
      ? {
          title: incident.title,
          description: incident.description,
          category: incident.category,
          origin: incident.origin,
          branch: incident.branch,
          client_company: incident.client_company ?? "",
          agent_id: incident.agent_id ?? "",
          customer_email: incident.customer_email ?? "",
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<FieldErrors<keyof IncidentDraft>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sending = useRef(false); // state updates are async: this stops a fast double click from sending twice
  const branchInput = useRef<HTMLInputElement>(null);

  const fromBranch = draft.origin === "branch";
  const problems = FIELDS.filter((key) => errors[key]);

  const focusField = (key: keyof IncidentDraft) => document.getElementById(`incident-${key}`)?.focus();

  const set = (key: keyof IncidentDraft) => (value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // origin and branch are validated together
    const stale = key === "origin" || key === "branch" ? ["origin", "branch"] : [key];
    if (stale.some((k) => errors[k as keyof IncidentDraft]))
      setErrors((prev) => ({ ...prev, ...Object.fromEntries(stale.map((k) => [k, undefined])) }));
    setFormError(null);
  };

  const changeOrigin = (origin: string) => {
    set("origin")(origin);
    if (origin === "branch" && draft.branch.trim().toLowerCase() === DEFAULT_BRANCH) {
      // "central" is not valid for a branch: leave it empty so the person types the real one.
      setDraft((prev) => ({ ...prev, origin, branch: "" }));
      setTimeout(() => branchInput.current?.focus(), 0);
    } else if (origin !== "branch" && draft.origin === "branch" && !draft.branch.trim()) {
      setDraft((prev) => ({ ...prev, origin, branch: DEFAULT_BRANCH }));
    }
  };

  const props = (key: keyof IncidentDraft) => ({
    id: `incident-${key}`,
    value: draft[key],
    onChange: (e: { target: { value: string } }) => set(key)(e.target.value),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `incident-${key}-error` : undefined,
    "aria-required": OPTIONAL.includes(key) ? undefined : true,
    className: inputClass,
  });

  const clear = () => {
    setDraft(EMPTY);
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setFormError(null);
    const found = validateIncidentDraft(draft);
    setErrors(found);
    const firstInvalid = FIELDS.find((key) => found[key]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    const clean = Object.fromEntries(FIELDS.map((key) => [key, draft[key].trim()])) as unknown as IncidentDraft;
    sending.current = true;
    setSaving(true);
    try {
      let saved: Incident;
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
        saved = await updateIncident(incident.id, changes);
      } else {
        const payload = Object.fromEntries(FIELDS.filter((key) => !OPTIONAL.includes(key) || clean[key]).map((key) => [key, clean[key]]));
        saved = await createIncident(payload as IncidentFields);
        clear(); // registered: ready for the next one
      }
      onSaved(saved);
    } catch (err) {
      // What was typed stays on screen: only the problems are shown, each next to its field.
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        const own = validateIncidentDraft(draft);
        const shown: FieldErrors<keyof IncidentDraft> = {};
        for (const field of Object.keys(err.fieldErrors)) {
          if (FIELDS.includes(field as keyof IncidentDraft))
            shown[field as keyof IncidentDraft] = friendlyFieldError(field, err.fieldTypes[field], own[field as keyof IncidentDraft]);
        }
        setErrors(shown);
        const first = FIELDS.find((key) => shown[key]);
        if (first) focusField(first);
      }
      setFormError(describeError(err, incident ? "No se pudo guardar la incidencia." : "No se pudo registrar la incidencia."));
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={incident ? "Editar incidencia" : "Registrar incidencia"}
      aria-busy={saving}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <h2 className="text-lg font-semibold text-white">{incident ? `Editar ${incident.id}` : "Datos de la incidencia"}</h2>
      <p className="mt-1 text-xs text-slate-500">Los campos marcados como «obligatorio» hay que rellenarlos.</p>

      {/* One fieldset: while it is sending, every control is locked */}
      <fieldset disabled={saving} className="mt-4 min-w-0 border-0 p-0">
        <legend className="sr-only">{incident ? "Datos de la incidencia a editar" : "Datos de la nueva incidencia"}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="incident-title" label="Título" required error={errors.title} hint="Un resumen corto: «La VPN se cae cada diez minutos».">
              <input {...props("title")} maxLength={LIMITS.titleMax} autoComplete="off" required />
            </Field>
          </div>
          <Field id="incident-category" label="Categoría" required error={errors.category}>
            <select {...props("category")} required>
              <option value="">Selecciona…</option>
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="incident-origin" label="Origen" required error={errors.origin}>
            <select {...props("origin")} onChange={(e) => changeOrigin(e.target.value)} required>
              {INCIDENT_ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {ORIGIN_LABELS[o]}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              id="incident-branch"
              label="Sucursal"
              required
              error={errors.branch}
              highlight={fromBranch}
              highlightNote="Esta incidencia viene de una sucursal: indica cuál. «central» no vale en este caso."
              hint={`Escribe «${DEFAULT_BRANCH}» cuando no aplique una sucursal concreta.`}
            >
              <input {...props("branch")} ref={branchInput} list="incident-branches" maxLength={LIMITS.branchMax} autoComplete="off" required />
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
              required
              error={errors.description}
              hint={`${draft.description.trim().length}/${LIMITS.descriptionMax} caracteres (mínimo ${LIMITS.descriptionMin})`}
            >
              <textarea {...props("description")} rows={3} maxLength={LIMITS.descriptionMax} required />
            </Field>
          </div>
          <Field id="incident-client_company" label="Empresa cliente" error={errors.client_company}>
            <input {...props("client_company")} list="incident-clients" maxLength={LIMITS.clientCompanyMax} autoComplete="off" />
            <datalist id="incident-clients">
              {clients.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="incident-agent_id" label="Agente" error={errors.agent_id} hint="Formato AGT-07">
            <input {...props("agent_id")} list="incident-agents" placeholder="AGT-07" autoComplete="off" />
            <datalist id="incident-agents">
              {agents.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
          <div className="sm:col-span-2">
            <Field id="incident-customer_email" label="Email del cliente" error={errors.customer_email} hint="Dato sensible: solo lo ve el equipo de soporte.">
              <input {...props("customer_email")} type="email" autoComplete="off" />
            </Field>
          </div>
        </div>
      </fieldset>

      {!incident && (
        <p className="mt-4 rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
          La incidencia se registrará como <strong className="text-slate-200">Abierta</strong>. El identificador y las fechas se asignan solos.
        </p>
      )}

      <div aria-live="polite" className="mt-4 space-y-3">
        {problems.length > 0 && (
          <ErrorBanner
            message={
              problems.length === 1
                ? "Revisa el campo marcado antes de continuar."
                : `Revisa los ${problems.length} campos marcados antes de continuar.`
            }
          />
        )}
        {formError && <ErrorBanner message={formError} />}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="animate-spin" size={14} aria-hidden="true" />}
          {saving ? (incident ? "Guardando…" : "Registrando…") : incident ? "Guardar cambios" : "Registrar incidencia"}
        </button>
        {incident ? (
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-full px-5 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50">
            Cancelar
          </button>
        ) : (
          <button type="button" onClick={clear} disabled={saving} className="rounded-full px-5 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-50">
            Limpiar formulario
          </button>
        )}
      </div>
    </form>
  );
}
