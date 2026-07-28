// components/incident-form.tsx — Formulario de creación de incidencias
//
// Renderiza un formulario completo con todos los campos requeridos:
// title, description, category, origin, branch.
//
// El campo branch SIEMPRE es visible en el formulario (Checklist #19).
// El status se inicializa como "open" por defecto.

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createIncident, VALID_CATEGORIES, VALID_STATUSES } from "@/lib/incident-actions";

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

export default function IncidentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(VALID_CATEGORIES[0]);
  const [origin, setOrigin] = useState<string>("customer");
  const [branch, setBranch] = useState<string>(VALID_BRANCHES[0].value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

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
    } catch (err: any) {
      const detail =
        err?.detail?.detail ??
        err?.detail ??
        err?.message ??
        "Error al crear la incidencia";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

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
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Ej: Paquete #12345 no entregado"
        />
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
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Describe los detalles de la incidencia..."
        />
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
          Categoría *
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {VALID_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] ?? cat}
            </option>
          ))}
        </select>
      </div>

      {/* Origen */}
      <div>
        <label htmlFor="origin" className="mb-1 block text-sm font-medium text-slate-700">
          Origen *
        </label>
        <select
          id="origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {VALID_ORIGINS.map((org) => (
            <option key={org} value={org}>
              {org === "customer" ? "Cliente" : org === "branch" ? "Sede" : "Interno"}
            </option>
          ))}
        </select>
      </div>

      {/* Sede — SIEMPRE visible (Checklist #19) */}
      <div>
        <label htmlFor="branch" className="mb-1 block text-sm font-medium text-slate-700">
          Sede *
        </label>
        <select
          id="branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {VALID_BRANCHES.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
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