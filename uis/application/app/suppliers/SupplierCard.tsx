"use client";

import { useState } from "react";
import { updateRate, updateStatus } from "./api";
import styles from "./suppliers.module.css";
import { CATEGORY_LABELS, STATUS_LABELS, type Supplier } from "./types";

interface Props {
  supplier: Supplier;
  onUpdated: (supplier: Supplier) => void;
}

function formatRate(value: number, currency: string) {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SupplierCard({ supplier, onUpdated }: Props) {
  const [editingRate, setEditingRate] = useState(false);
  const [rate, setRate] = useState(String(supplier.rate_per_unit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = supplier.status === "active";

  async function run(action: () => Promise<Supplier>) {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await action());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRateSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) {
      setError("La tarifa debe ser mayor que cero.");
      return;
    }
    if (await run(() => updateRate(supplier.id, value))) setEditingRate(false);
  }

  return (
    <article className={`${styles.card} ${isActive ? styles.cardActive : styles.cardSuspended}`}>
      <header className={styles.cardHeader}>
        <h3>{supplier.name}</h3>
        <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeSuspended}`}>
          {STATUS_LABELS[supplier.status]}
        </span>
      </header>

      <p className={styles.country}>
        {supplier.country === "Colombia" ? "🇨🇴" : "🇺🇸"} {supplier.country}
      </p>

      <ul className={styles.chips}>
        {supplier.categories.map((c) => (
          <li key={c}>{CATEGORY_LABELS[c]}</li>
        ))}
      </ul>

      {editingRate ? (
        <form className={styles.rateForm} onSubmit={handleRateSubmit}>
          <input
            type="number"
            min="0"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            aria-label={`Nueva tarifa en ${supplier.currency}`}
            autoFocus
          />
          <span>{supplier.currency}</span>
          <button type="submit" className={styles.primary} disabled={busy}>
            Guardar
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setEditingRate(false);
              setRate(String(supplier.rate_per_unit));
              setError(null);
            }}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <p className={styles.rate}>
          {formatRate(supplier.rate_per_unit, supplier.currency)}
          <small> / unidad</small>
        </p>
      )}

      <p className={styles.meta}>Tarifa actualizada: {formatDate(supplier.updated_at)}</p>
      {supplier.contact_email && (
        <p className={styles.meta}>
          <a href={`mailto:${supplier.contact_email}`}>{supplier.contact_email}</a>
        </p>
      )}
      {supplier.notes && <p className={styles.notes}>{supplier.notes}</p>}

      {error && <p className={styles.error}>{error}</p>}

      <footer className={styles.cardActions}>
        {!editingRate && (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setRate(String(supplier.rate_per_unit));
              setEditingRate(true);
            }}
          >
            Actualizar tarifa
          </button>
        )}
        <button
          type="button"
          className={isActive ? styles.danger : styles.success}
          disabled={busy}
          onClick={() => run(() => updateStatus(supplier.id, isActive ? "suspended" : "active"))}
        >
          {isActive ? "Suspender" : "Activar"}
        </button>
      </footer>
    </article>
  );
}
