"use client";

import { useState, type FormEvent } from "react";
import {
  ApiError,
  CATEGORIES,
  CATEGORY_LABELS,
  COUNTRIES,
  COUNTRY_LABELS,
  CURRENCY_BY_COUNTRY,
  STATUSES,
  STATUS_LABELS,
  createSupplier,
  type Category,
  type Country,
  type Supplier,
  type SupplierStatus,
} from "@/lib/suppliersApi";

type Props = { onCreated: (supplier: Supplier) => void; onCancel: () => void };

export function SupplierForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>("Spain");
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyRate, setMonthlyRate] = useState("");
  const [status, setStatus] = useState<SupplierStatus>("active");
  const [renewalDate, setRenewalDate] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const currency = CURRENCY_BY_COUNTRY[country];

  function toggleCategory(category: Category) {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  }

  // Quick client-side check of required fields; the API remains the source of truth (422/409).
  function validate(): string[] {
    const problems: string[] = [];
    if (!name.trim()) problems.push("Nombre: es obligatorio.");
    if (categories.length === 0) problems.push("Categorías: selecciona al menos una.");
    if (monthlyRate === "") problems.push("Tarifa mensual: es obligatoria.");
    else if (!(Number(monthlyRate) > 0)) problems.push("Tarifa mensual: debe ser mayor que 0.");
    return problems;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) return;
    setSaving(true);
    try {
      const supplier = await createSupplier({
        name: name.trim(),
        country,
        categories,
        monthly_rate: Number(monthlyRate),
        currency,
        status,
        contract_renewal_date: renewalDate || null,
        contact_email: email.trim() || null,
        notes: notes.trim() || null,
      });
      onCreated(supplier);
    } catch (reason) {
      setErrors(reason instanceof ApiError ? reason.messages : ["Error inesperado"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card supplier-form" onSubmit={submit} noValidate>
      <h2>Nuevo proveedor</h2>
      <div className="form-grid">
        <label>
          Nombre *
          <input value={name} required aria-required="true" onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          País *
          <select value={country} onChange={(event) => setCountry(event.target.value as Country)}>
            {COUNTRIES.map((value) => <option key={value} value={value}>{COUNTRY_LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          Tarifa mensual *
          <input type="number" min="0.01" step="0.01" inputMode="decimal" required aria-required="true" value={monthlyRate} onChange={(event) => setMonthlyRate(event.target.value)} />
        </label>
        <label>
          Moneda
          <input value={currency} readOnly aria-describedby="currency-hint" />
          <small id="currency-hint" className="muted">Se asigna según el país.</small>
        </label>
        <label>
          Estado *
          <select value={status} onChange={(event) => setStatus(event.target.value as SupplierStatus)}>
            {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          Fecha de renovación
          <input type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} />
        </label>
        <label>
          Email de contacto
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
      </div>
      <fieldset className="category-picker">
        <legend>Categorías * <span className="muted">(una o varias)</span></legend>
        {CATEGORIES.map((category) => (
          <label key={category} className="check">
            <input type="checkbox" checked={categories.includes(category)} onChange={() => toggleCategory(category)} />
            {CATEGORY_LABELS[category]}
          </label>
        ))}
      </fieldset>
      <label className="block">
        Notas
        <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {errors.length > 0 && (
        <div className="form-errors" role="alert">
          <strong>No se pudo guardar el proveedor:</strong>
          <ul>{errors.map((message) => <li key={message}>{message}</li>)}</ul>
        </div>
      )}
      <div className="actions">
        <button type="submit" disabled={saving}>{saving ? "Guardando…" : "Registrar proveedor"}</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
