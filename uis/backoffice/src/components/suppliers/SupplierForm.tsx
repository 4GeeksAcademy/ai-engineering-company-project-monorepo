import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError, createSupplier } from "../../lib/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COUNTRY_CURRENCY,
  type Category,
  type Country,
  type Supplier,
} from "../../types/suppliers";

interface Props {
  onCreated: (supplier: Supplier) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none";

export default function SupplierForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>("Spain");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rate, setRate] = useState("");
  const [renewal, setRenewal] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currency = COUNTRY_CURRENCY[country];

  const toggleCategory = (c: Category) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const problems: string[] = [];
    if (!name.trim()) problems.push("El nombre es obligatorio.");
    if (!(Number(rate) > 0)) problems.push("La tarifa mensual debe ser un número mayor que 0.");
    if (categories.length === 0) problems.push("Selecciona al menos una categoría.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) problems.push("El email no es válido.");
    if (problems.length > 0) {
      setError(problems.join(" "));
      return;
    }
    setSaving(true);
    try {
      const created = await createSupplier({
        name: name.trim(),
        country,
        categories,
        monthly_rate: Number(rate),
        currency,
        status: "active",
        contract_renewal_date: renewal || null,
        contact_email: email.trim() || null,
        notes: notes.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">Nuevo proveedor</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          Nombre
          <input required aria-required="true" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          País
          <select value={country} onChange={(e) => setCountry(e.target.value as Country)} className={inputClass}>
            <option value="Spain">Spain</option>
            <option value="USA">USA</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Tarifa mensual ({currency})
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-300">
          Renovación del contrato
          <input type="date" value={renewal} onChange={(e) => setRenewal(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          Email del account manager
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          Notas
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm text-slate-300">Categorías</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCategory(c)}
              aria-pressed={categories.includes(c)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                categories.includes(c)
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                  : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {saving && <Loader2 className="animate-spin" size={14} />}
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-5 py-2 text-sm text-slate-300 hover:text-white">
          Cancelar
        </button>
      </div>
    </form>
  );
}
