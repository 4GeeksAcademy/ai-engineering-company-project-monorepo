// components/incident-form.tsx — Formulario de creación de incidencias
//
// Renderiza un formulario completo con todos los campos requeridos:
// title, description, category, origin, branch.
//
// El campo branch SIEMPRE es visible en el formulario (Checklist #19).
// Cuando origin=branch, el campo branch se destaca visualmente (Checklist #20).
// Errores de campo específico aparecen junto al campo (Checklist #23).
// Validación local de campos requeridos antes de enviar (Checklist #25).
// El status se inicializa como "open" por defecto.

"use client";

import { useState, FormEvent } from "react";
import { createIncident, VALID_CATEGORIES } from "@/lib/incident-actions";

const VALID_ORIGINS = ["customer", "branch", "internal"] as const;
const VALID_BRANCHES = [
  { value: "central", label: "Central" },
  { value: "la_warehouse", label: "LA Warehouse" },
  { value: "la_office", label: "LA Office" },
  { value: "zaragoza_warehouse", label: "Zaragoza Warehouse" },
  { value: "zaragoza_office", label: "Zaragoza Office" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  lost_parcel: "Paquete perdido",
  delivery_failure: "Fallo de entrega",
  inventory_discrepancy: "Discrepancia de inventario",
  carrier_issue: "Problema con transportista",
  returns_issue: "Problema de devolución",
  system_failure: "Fallo del sistema",
  client_complaint: "Queja del cliente",
  other: "Otro",
};

type FieldErrors = Record<string, string>;

export default function IncidentForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(VALID_CATEGORIES[0]);
  const [origin, setOrigin] = useState<string>("customer");
  const [branch, setBranch] = useState<string>(VALID_BRANCHES[0].value);

  const validateLocal = (): boolean => {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = "El título es obligatorio.";
    if (!description.trim()) errors.description = "La descripción es obligatoria.";
    if (!category) errors.category = "Selecciona una categoría.";
    if (!origin) errors.origin = "Selecciona un origen.";
    if (!branch) errors.branch = "Selecciona una sede.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateLocal()) return;

    setLoading(true);

    try {
      await createIncident({
        title,
        description,
        category,
        origin,
        branch,
      });
      setSuccess(true);
      // Reset form
      setTitle("");
      setDescription("");
      setCategory(VALID_CATEGORIES[0]);
      setOrigin("customer");
      setBranch(VALID_BRANCHES[0].value);
      setFieldErrors({});
    } catch (err: any) {
      const detail =
        err?.detail?.detail ??
        err?.detail ??
        err?.message ??
        "Error al crear la incidencia";
      const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Highlight branch when origin is "branch"
  const isBranchOrigin = origin === "branch";
  const branchContainerClass = isBranchOrigin
    ? "rounded-xl border-2 border-indigo-400 bg-indigo-50/50 p-4 transition-all duration-300"
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Título */}
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Título *
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setFieldErrors((prev) => ({ ...prev, title: "" })); }}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
            fieldErrors.title
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
          }`}
          placeholder="Ej: Paquete #12345 no entregado"
        />
        {fieldErrors.title && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.title}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Descripción *
        </label>
        <textarea
          id="description"
          required
          maxLength={2000}
          rows={4}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setFieldErrors((prev) => ({ ...prev, description: "" })); }}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
            fieldErrors.description
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
          }`}
          placeholder="Describe los detalles de la incidencia..."
        />
        {fieldErrors.description && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.description}</p>
        )}
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
          Categoría *
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setFieldErrors((prev) => ({ ...prev, category: "" })); }}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
            fieldErrors.category
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
          }`}
        >
          {VALID_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] ?? cat}
            </option>
          ))}
        </select>
        {fieldErrors.category && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.category}</p>
        )}
      </div>

      {/* Origen */}
      <div>
        <label htmlFor="origin" className="mb-1 block text-sm font-medium text-slate-700">
          Origen *
        </label>
        <select
          id="origin"
          value={origin}
          onChange={(e) => { setOrigin(e.target.value); setFieldErrors((prev) => ({ ...prev, origin: "" })); }}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
            fieldErrors.origin
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
          }`}
        >
          {VALID_ORIGINS.map((org) => (
            <option key={org} value={org}>
              {org === "customer" ? "Cliente" : org === "branch" ? "Sede" : "Interno"}
            </option>
          ))}
        </select>
        {fieldErrors.origin && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.origin}</p>
        )}
      </div>

      {/* Sede — SIEMPRE visible (Checklist #19) */}
      {/* Cuando origin=branch, se destaca visualmente (Checklist #20) */}
      <div className={branchContainerClass}>
        {isBranchOrigin && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            🏢 Origen es Sede — selecciona la sede
          </p>
        )}
        <div>
          <label htmlFor="branch" className="mb-1 block text-sm font-medium text-slate-700">
            Sede *
          </label>
          <select
            id="branch"
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setFieldErrors((prev) => ({ ...prev, branch: "" })); }}
            className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
              fieldErrors.branch
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : isBranchOrigin
                  ? "border-indigo-400 focus:border-indigo-600 focus:ring-indigo-300"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          >
            {VALID_BRANCHES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          {fieldErrors.branch && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.branch}</p>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Incidencia creada con éxito.
        </div>
      )}

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creando..." : "Crear incidencia"}
      </button>
    </form>
  );
}