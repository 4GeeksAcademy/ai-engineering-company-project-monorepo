"use client";

import { useCallback, useEffect, useState } from "react";
import { SupplierForm } from "@/components/SupplierForm";
import { SupplierRow } from "@/components/SupplierRow";
import {
  ApiError,
  CATEGORIES,
  CATEGORY_LABELS,
  COUNTRIES,
  COUNTRY_LABELS,
  RENEWAL_WINDOW_DAYS,
  listSuppliers,
  type Category,
  type Country,
  type Supplier,
} from "@/lib/suppliersApi";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [country, setCountry] = useState<Country | "">("");
  const [category, setCategory] = useState<Category | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSuppliers(await listSuppliers({ country, category }));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.messages.join(" ") : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [country, category]);

  useEffect(() => {
    load();
  }, [load]);

  function replace(updated: Supplier) {
    setSuppliers((current) => current.map((supplier) => (supplier.id === updated.id ? updated : supplier)));
  }

  function created(supplier: Supplier) {
    setShowForm(false);
    setNotice(`Proveedor «${supplier.name}» registrado.`);
    load();
  }

  const activeCount = suppliers.filter((supplier) => supplier.status === "active").length;

  return (
    <main className="wide">
      <div className="page-header">
        <div>
          <h1>Proveedores</h1>
          <p className="muted">Registro oficial de proveedores y servicios contratados por Nexova.</p>
        </div>
        {!showForm && <button type="button" onClick={() => { setNotice(""); setShowForm(true); }}>+ Nuevo proveedor</button>}
      </div>

      {showForm && <SupplierForm onCreated={created} onCancel={() => setShowForm(false)} />}

      <section className="card filters" aria-label="Filtros">
        <label>
          País
          <select value={country} onChange={(event) => setCountry(event.target.value as Country | "")}>
            <option value="">Todos</option>
            {COUNTRIES.map((value) => <option key={value} value={value}>{COUNTRY_LABELS[value]}</option>)}
          </select>
        </label>
        <label>
          Categoría
          <select value={category} onChange={(event) => setCategory(event.target.value as Category | "")}>
            <option value="">Todas</option>
            {CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
          </select>
        </label>
        <p className="legend muted small">
          <span className="swatch soon" /> Renovación en los próximos {RENEWAL_WINDOW_DAYS} días
          <span className="swatch overdue" /> Renovación vencida
        </p>
      </section>

      <div aria-live="polite">
        {notice && <p className="success">{notice}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <section className="card">
        <p className="muted small">
          {loading ? "Cargando…" : `${suppliers.length} proveedores · ${activeCount} activos · ${suppliers.length - activeCount} suspendidos`}
        </p>
        <table className="suppliers">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>País</th>
              <th>Categorías</th>
              <th className="num">Tarifa mensual</th>
              <th>Estado</th>
              <th>Renovación</th>
              <th>Tarifa actualizada</th>
              <th><span className="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                onChange={replace}
                onDelete={(id) => setSuppliers((current) => current.filter((item) => item.id !== id))}
                onError={setError}
              />
            ))}
            {!loading && suppliers.length === 0 && (
              <tr><td colSpan={8} className="muted">No hay proveedores que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
