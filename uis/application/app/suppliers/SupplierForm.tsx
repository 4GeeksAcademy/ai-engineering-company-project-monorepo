"use client";

import { useState } from "react";
import { createSupplier } from "./api";
import styles from "./suppliers.module.css";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COUNTRIES,
  CURRENCY_BY_COUNTRY,
  STATUSES,
  STATUS_LABELS,
  type Category,
  type Country,
  type Supplier,
  type SupplierStatus,
} from "./types";

interface Props {
  onCreated: (supplier: Supplier) => void;
  onCancel: () => void;
}

export default function SupplierForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>("Colombia");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rate, setRate] = useState("");
  const [status, setStatus] = useState<SupplierStatus>("active");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currency = CURRENCY_BY_COUNTRY[country];

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const rateValue = Number(rate);
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (categories.length === 0) return setError("Selecciona al menos una categoría.");
    if (!Number.isFinite(rateValue) || rateValue <= 0)
      return setError("La tarifa debe ser un número mayor que cero.");

    setSaving(true);
    try {
      const created = await createSupplier({
        name: name.trim(),
        country,
        categories,
        rate_per_unit: rateValue,
        currency,
        status,
        contact_email: email.trim() || null,
        notes: notes.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el proveedor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>Registrar proveedor</h2>

      <div className={styles.formGrid}>
        <label>
          Nombre comercial *
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          País *
          <select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tarifa por unidad ({currency}) *
          <input
            type="number"
            min="0"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>

        <label>
          Moneda
          <input value={currency} readOnly disabled />
        </label>

        <label>
          Estado *
          <select value={status} onChange={(e) => setStatus(e.target.value as SupplierStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Email de contacto
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>

      <fieldset className={styles.categoryPicker}>
        <legend>Categorías * (mínimo una)</legend>
        {CATEGORIES.map((c) => (
          <label key={c} className={styles.checkbox}>
            <input
              type="checkbox"
              checked={categories.includes(c)}
              onChange={() => toggleCategory(c)}
            />
            {CATEGORY_LABELS[c]}
          </label>
        ))}
      </fieldset>

      <label>
        Notas internas
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={saving}>
          {saving ? "Guardando…" : "Registrar proveedor"}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
