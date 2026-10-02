import { FormEvent, useState } from "react";
import { Check, Pencil, Power, X } from "lucide-react";
import { CATEGORY_LABELS, type Supplier } from "./types";

interface Props {
  supplier: Supplier;
  onRateChange: (id: number, rate: number) => Promise<void>;
  onToggleStatus: (supplier: Supplier) => Promise<void>;
}

const RENEWAL_WARNING_DAYS = 60;

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export default function SupplierRow({ supplier, onRateChange, onToggleStatus }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(supplier.monthly_rate));
  const [busy, setBusy] = useState(false);

  const suspended = supplier.status === "suspended";
  const days = supplier.contract_renewal_date ? daysUntil(supplier.contract_renewal_date) : null;
  const renewalSoon = days !== null && days >= 0 && days <= RENEWAL_WARNING_DAYS;
  const renewalOverdue = days !== null && days < 0;

  const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: supplier.currency });

  const submitRate = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(draft);
    if (!(value > 0)) return;
    setBusy(true);
    try {
      await onRateChange(supplier.id, value);
      setEditing(false);
    } catch {
      // The page already shows the API error; keep the editor open so the value can be fixed.
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await onToggleStatus(supplier);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className={`border-t border-slate-800 ${suspended ? "opacity-60" : ""} ${renewalSoon ? "bg-amber-400/10" : ""}`}>
      <td className={`px-4 py-3 ${renewalSoon ? "border-l-4 border-amber-400" : ""}`}>
        <p className="font-medium text-white">{supplier.name}</p>
        {supplier.contact_email && <p className="mt-0.5 text-xs text-slate-400">{supplier.contact_email}</p>}
        {supplier.notes && <p className="mt-0.5 max-w-xs text-xs text-slate-500">{supplier.notes}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-300">{supplier.country}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {supplier.categories.map((c) => (
            <span key={c} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-200">
        {editing ? (
          <form onSubmit={submitRate} className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Nueva tarifa de ${supplier.name}`}
              className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
            />
            <button type="submit" disabled={busy} aria-label="Guardar tarifa" className="text-emerald-400 hover:text-emerald-300">
              <Check size={16} />
            </button>
            <button type="button" aria-label="Cancelar" onClick={() => setEditing(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            {money.format(supplier.monthly_rate)}
            <button
              onClick={() => {
                setDraft(String(supplier.monthly_rate));
                setEditing(true);
              }}
              aria-label={`Editar tarifa de ${supplier.name}`}
              className="text-slate-500 hover:text-cyan-300"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
        <p className="mt-0.5 text-xs text-slate-500">
          Actualizada {new Date(supplier.updated_at).toLocaleString("es-ES")}
        </p>
      </td>
      <td className="px-4 py-3 text-sm">
        {supplier.contract_renewal_date ? (
          <span className={renewalSoon ? "font-semibold text-amber-300" : renewalOverdue ? "text-rose-400" : "text-slate-300"}>
            {supplier.contract_renewal_date}
            {renewalSoon && <span className="block text-xs">Renueva en {days} días</span>}
            {renewalOverdue && <span className="block text-xs">Fecha vencida</span>}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={toggle}
          disabled={busy}
          aria-label={suspended ? `Activar ${supplier.name}` : `Suspender ${supplier.name}`}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
            suspended
              ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          <Power size={12} />
          {suspended ? "Suspendido" : "Activo"}
        </button>
      </td>
    </tr>
  );
}
