"use client";

import { FormEvent, useMemo, useState } from "react";

import { Spinner } from "../ui/Spinner";
import {
  IncidentBranch,
  IncidentCategory,
  IncidentCreatePayload,
  IncidentOrigin,
  IncidentStatus,
  createIncident,
  extractIncidentFieldErrors,
} from "../../../services/incidentsApi";

type ToastKind = "success" | "error";

interface IncidentRegistrationFormProps {
  onCreated: () => void;
  onNotify: (kind: ToastKind, message: string) => void;
}

type FormState = {
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
};

const branchOptions: IncidentBranch[] = ["Los Ángeles", "Zaragoza", "Central"];
const categoryOptions: IncidentCategory[] = [
  "Almacen",
  "Ultima_Milla",
  "Logistica_Inversa",
  "CX",
  "Comercial",
  "Tecnologia",
];
const statusOptions: IncidentStatus[] = ["open", "in_progress", "resolved", "discarded"];
const originOptions: IncidentOrigin[] = ["customer", "branch", "internal"];

const initialForm: FormState = {
  title: "",
  description: "",
  category: "Almacen",
  status: "open",
  origin: "customer",
  branch: "Central",
};

const fieldLabels: Record<keyof FormState, string> = {
  title: "Título",
  description: "Descripción",
  category: "Categoría",
  status: "Estado",
  origin: "Origen",
  branch: "Sede",
};

function toApiPayload(form: FormState): IncidentCreatePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    status: form.status,
    origin: form.origin,
    branch: form.branch,
  };
}

export function IncidentRegistrationForm({ onCreated, onNotify }: IncidentRegistrationFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const branchHighlight = useMemo(() => form.origin === "branch", [form.origin]);

  const clearFieldError = (field: keyof FormState) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await createIncident(toApiPayload(form));
      setForm(initialForm);
      onCreated();
      onNotify("success", "Incidencia creada correctamente.");
    } catch (error) {
      const mappedFieldErrors = (await extractIncidentFieldErrors(error)) as Partial<Record<keyof FormState, string>>;

      if (Object.keys(mappedFieldErrors).length > 0) {
        setFieldErrors(mappedFieldErrors);
      } else {
        setGeneralError("No pudimos crear la incidencia. Vuelve a intentarlo.");
      }

      onNotify("error", "No se pudo crear la incidencia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Registro</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Nueva incidencia</h2>
        <p className="mt-2 text-sm text-slate-600">Completa los campos obligatorios para registrar una incidencia.</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          {fieldLabels.title}
          <input
            required
            type="text"
            value={form.title}
            onChange={(event) => {
              clearFieldError("title");
              setForm((prev) => ({ ...prev, title: event.target.value }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
            placeholder="Demora en despacho de pedidos"
          />
          {fieldErrors.title ? <span className="text-xs text-rose-700">{fieldErrors.title}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          {fieldLabels.description}
          <textarea
            required
            value={form.description}
            onChange={(event) => {
              clearFieldError("description");
              setForm((prev) => ({ ...prev, description: event.target.value }));
            }}
            className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
            placeholder="Describe el incidente con detalle operativo"
          />
          {fieldErrors.description ? <span className="text-xs text-rose-700">{fieldErrors.description}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          {fieldLabels.category}
          <select
            value={form.category}
            onChange={(event) => {
              clearFieldError("category");
              setForm((prev) => ({ ...prev, category: event.target.value as IncidentCategory }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {fieldErrors.category ? <span className="text-xs text-rose-700">{fieldErrors.category}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          {fieldLabels.status}
          <select
            value={form.status}
            onChange={(event) => {
              clearFieldError("status");
              setForm((prev) => ({ ...prev, status: event.target.value as IncidentStatus }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {fieldErrors.status ? <span className="text-xs text-rose-700">{fieldErrors.status}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          {fieldLabels.origin}
          <select
            value={form.origin}
            onChange={(event) => {
              clearFieldError("origin");
              setForm((prev) => ({ ...prev, origin: event.target.value as IncidentOrigin }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
          >
            {originOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {fieldErrors.origin ? <span className="text-xs text-rose-700">{fieldErrors.origin}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{fieldLabels.branch}</span>
          <select
            required
            value={form.branch}
            onChange={(event) => {
              clearFieldError("branch");
              setForm((prev) => ({ ...prev, branch: event.target.value as IncidentBranch }));
            }}
            className={
              branchHighlight
                ? "rounded-lg border-2 border-cyan-600 bg-cyan-50 px-3 py-2 text-slate-900 outline-none"
                : "rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:outline-none"
            }
          >
            {branchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {branchHighlight ? (
            <span className="text-xs text-cyan-800">Origen por sucursal detectado: revisa que la sede sea correcta.</span>
          ) : null}
          {fieldErrors.branch ? <span className="text-xs text-rose-700">{fieldErrors.branch}</span> : null}
        </label>

        <div className="md:col-span-2 flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Spinner size="sm" label="Guardando" /> : "Registrar incidencia"}
          </button>
        </div>
      </form>

      {generalError ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{generalError}</p>
      ) : null}
    </section>
  );
}
