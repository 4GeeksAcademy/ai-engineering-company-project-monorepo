"use client";

import { useState, type FormEvent } from "react";
import {
  ApiError,
  CATEGORY_LABELS,
  COUNTRY_LABELS,
  STATUS_LABELS,
  deleteSupplier,
  formatDate,
  formatDateTime,
  formatMoney,
  renewalState,
  updateSupplierRate,
  updateSupplierStatus,
  type Supplier,
} from "@/lib/suppliersApi";

type Props = {
  supplier: Supplier;
  onChange: (supplier: Supplier) => void;
  onDelete: (id: number) => void;
  onError: (message: string) => void;
};

function errorText(reason: unknown): string {
  return reason instanceof ApiError ? reason.messages.join(" ") : "Error inesperado";
}

export function SupplierRow({ supplier, onChange, onDelete, onError }: Props) {
  const [editingRate, setEditingRate] = useState(false);
  const [rate, setRate] = useState(String(supplier.monthly_rate));
  const [busy, setBusy] = useState(false);
  const suspended = supplier.status === "suspended";
  const renewal = renewalState(supplier.contract_renewal_date);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      onError(`${supplier.name}: ${errorText(reason)}`);
    } finally {
      setBusy(false);
    }
  }

  function saveRate(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      onChange(await updateSupplierRate(supplier.id, Number(rate)));
      setEditingRate(false);
    });
  }

  function toggleStatus() {
    run(async () => onChange(await updateSupplierStatus(supplier.id, suspended ? "active" : "suspended")));
  }

  function remove() {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente «${supplier.name}»?\n\n` +
        "Los proveedores suspendidos se conservan como historial de la relación comercial. " +
        "Si solo deja de usarse, es preferible suspenderlo.",
    );
    if (confirmed) run(async () => { await deleteSupplier(supplier.id); onDelete(supplier.id); });
  }

  const rowClass = [suspended && "row-suspended", renewal && `row-renewal-${renewal}`].filter(Boolean).join(" ");

  return (
    <tr className={rowClass || undefined}>
      <td>
        <strong>{supplier.name}</strong>
        {supplier.notes && <div className="muted small">{supplier.notes}</div>}
      </td>
      <td>{COUNTRY_LABELS[supplier.country]}</td>
      <td>
        <ul className="chips">
          {supplier.categories.map((category) => <li key={category}>{CATEGORY_LABELS[category]}</li>)}
        </ul>
      </td>
      <td className="num">
        {editingRate ? (
          <form className="rate-edit" onSubmit={saveRate}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              aria-label={`Nueva tarifa de ${supplier.name} en ${supplier.currency}`}
              autoFocus
            />
            <button type="submit" className="small" disabled={busy}>Guardar</button>
            <button type="button" className="small secondary" onClick={() => { setEditingRate(false); setRate(String(supplier.monthly_rate)); }}>
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="link" title="Editar tarifa" onClick={() => setEditingRate(true)}>
            {formatMoney(supplier.monthly_rate, supplier.currency)} ✎
          </button>
        )}
      </td>
      <td>
        <span className={`badge ${supplier.status}`}>{STATUS_LABELS[supplier.status]}</span>
      </td>
      <td>
        {supplier.contract_renewal_date ? (
          <>
            {formatDate(supplier.contract_renewal_date)}
            {renewal === "overdue" && <span className="tag overdue">Vencida</span>}
            {renewal === "soon" && <span className="tag soon">Próxima</span>}
          </>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td className="small">{formatDateTime(supplier.updated_at)}</td>
      <td className="row-actions">
        <button type="button" className={`small ${suspended ? "" : "warn"}`} onClick={toggleStatus} disabled={busy}>
          {suspended ? "Activar" : "Suspender"}
        </button>
        <button type="button" className="link danger small" onClick={remove} disabled={busy}>Eliminar</button>
      </td>
    </tr>
  );
}
