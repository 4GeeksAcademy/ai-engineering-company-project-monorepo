"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type SupplierStatus = "active" | "suspended";

export type Supplier = {
  id: number;
  name: string;
  country: "USA" | "Spain";
  categories: string[];
  rate_per_shipment: number;
  currency: "USD" | "EUR";
  status: SupplierStatus;
  updated_at: string;
  service_zone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

type SupplierForm = {
  name: string;
  country: "USA" | "Spain";
  categories: string;
  rate_per_shipment: string;
  status: SupplierStatus;
  service_zone: string;
  contact_email: string;
  notes: string;
};

const CATEGORY_OPTIONS = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities",
];

const INITIAL_FORM: SupplierForm = {
  name: "",
  country: "USA",
  categories: "carrier_last_mile",
  rate_per_shipment: "",
  status: "active",
  service_zone: "",
  contact_email: "",
  notes: "",
};

type SuppliersClientProps = {
  initialSuppliers: Supplier[];
};

export default function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [form, setForm] = useState<SupplierForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>(
    Object.fromEntries(initialSuppliers.map((supplier) => [supplier.id, String(supplier.rate_per_shipment)])),
  );
  const [rowBusy, setRowBusy] = useState<Record<number, boolean>>({});

  const computedCurrency = form.country === "USA" ? "USD" : "EUR";

  async function loadSuppliers(nextCountry: string, nextCategory: string) {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();

      if (nextCountry) {
        query.set("country", nextCountry);
      }

      if (nextCategory) {
        query.set("category", nextCategory);
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";

      const response = await fetch(`/backend/suppliers${suffix}`);
      const data = (await response.json().catch(() => [])) as Supplier[];

      if (!response.ok) {
        throw new Error("No fue posible cargar los proveedores.");
      }

      setSuppliers(data);
      setRateDrafts(
        Object.fromEntries(data.map((supplier) => [supplier.id, String(supplier.rate_per_shipment)])),
      );
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("Error inesperado al cargar proveedores.");
      }
    } finally {
      setLoading(false);
    }
  }

  const suppliersCountLabel = useMemo(() => {
    if (loading) {
      return "Cargando proveedores...";
    }

    return `${suppliers.length} proveedor(es) en pantalla`;
  }, [loading, suppliers.length]);

  function parseCategories(raw: string): string[] {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index);
  }

  async function handleCreateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const categories = parseCategories(form.categories);

    if (categories.length === 0) {
      setSubmitting(false);
      setError("Debes indicar al menos una categoria.");
      return;
    }

    const numericRate = Number(form.rate_per_shipment);

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      setSubmitting(false);
      setError("La tarifa debe ser un numero mayor que cero.");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        country: form.country,
        categories,
        rate_per_shipment: numericRate,
        currency: computedCurrency,
        status: form.status,
        service_zone: form.service_zone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        notes: form.notes.trim() || null,
      };

      const response = await fetch("/backend/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as {
        detail?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.detail ?? "La API rechazo la creacion del proveedor.");
      }

      setForm(INITIAL_FORM);
      setSuccess("Proveedor creado correctamente.");
      await loadSuppliers(countryFilter, categoryFilter);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("No fue posible crear el proveedor.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRateUpdate(supplierId: number) {
    const currentValue = Number(rateDrafts[supplierId]);

    if (!Number.isFinite(currentValue) || currentValue <= 0) {
      setError("La tarifa debe ser mayor que cero.");
      return;
    }

    setError("");
    setSuccess("");
    setRowBusy((previous) => ({ ...previous, [supplierId]: true }));

    try {
      const response = await fetch(`/backend/suppliers/${supplierId}/rate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rate_per_shipment: currentValue }),
      });

      const data = (await response.json().catch(() => null)) as Supplier | { detail?: string } | null;

      if (!response.ok) {
        const detail = (data as { detail?: string } | null)?.detail;
        throw new Error(detail ?? "No fue posible actualizar la tarifa.");
      }

      const updated = data as Supplier;
      setSuppliers((previous) => previous.map((supplier) => (supplier.id === supplierId ? updated : supplier)));
      setRateDrafts((previous) => ({ ...previous, [supplierId]: String(updated.rate_per_shipment) }));
      setSuccess(`Tarifa actualizada para ${updated.name}.`);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("No fue posible actualizar la tarifa.");
      }
    } finally {
      setRowBusy((previous) => ({ ...previous, [supplierId]: false }));
    }
  }

  async function handleStatusToggle(supplier: Supplier) {
    setError("");
    setSuccess("");
    setRowBusy((previous) => ({ ...previous, [supplier.id]: true }));

    const nextStatus: SupplierStatus = supplier.status === "active" ? "suspended" : "active";

    try {
      const response = await fetch(`/backend/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await response.json().catch(() => null)) as Supplier | { detail?: string } | null;

      if (!response.ok) {
        const detail = (data as { detail?: string } | null)?.detail;
        throw new Error(detail ?? "No fue posible actualizar el estado.");
      }

      const updated = data as Supplier;
      setSuppliers((previous) => previous.map((entry) => (entry.id === supplier.id ? updated : entry)));
      setSuccess(`Estado actualizado para ${updated.name}.`);
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("No fue posible actualizar el estado.");
      }
    } finally {
      setRowBusy((previous) => ({ ...previous, [supplier.id]: false }));
    }
  }

  async function handleCountryFilterChange(nextCountry: string) {
    setCountryFilter(nextCountry);
    await loadSuppliers(nextCountry, categoryFilter);
  }

  async function handleCategoryFilterChange(nextCategory: string) {
    setCategoryFilter(nextCategory);
    await loadSuppliers(countryFilter, nextCategory);
  }

  return (
    <main className="container">
      <header className="pageHeader">
        <span className="eyebrow">CARRIER OPERATIONS</span>
        <h1>Directorio de proveedores</h1>
        <p>
          Gestiona proveedores por pais y categoria, crea nuevos registros y actualiza tarifa o estado sin recargar la
          pagina.
        </p>
      </header>

      <section className="card">
        <h2>Nuevo proveedor</h2>

        <form className="supplierForm" onSubmit={handleCreateSupplier}>
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              required
            />
          </label>

          <label>
            Pais
            <select
              value={form.country}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  country: event.target.value as "USA" | "Spain",
                }))
              }
            >
              <option value="USA">USA</option>
              <option value="Spain">Spain</option>
            </select>
          </label>

          <label>
            Moneda
            <input value={computedCurrency} disabled />
          </label>

          <label>
            Estado
            <select
              value={form.status}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  status: event.target.value as SupplierStatus,
                }))
              }
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
          </label>

          <label>
            Tarifa por envio
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.rate_per_shipment}
              onChange={(event) => setForm((previous) => ({ ...previous, rate_per_shipment: event.target.value }))}
              required
            />
          </label>

          <label className="fullWidth">
            Categorias (separadas por coma)
            <input
              value={form.categories}
              onChange={(event) => setForm((previous) => ({ ...previous, categories: event.target.value }))}
              required
            />
            <small>Categorias validas: {CATEGORY_OPTIONS.join(", ")}</small>
          </label>

          <label>
            Zona de servicio
            <input
              value={form.service_zone}
              onChange={(event) => setForm((previous) => ({ ...previous, service_zone: event.target.value }))}
            />
          </label>

          <label>
            Email de contacto
            <input
              type="email"
              value={form.contact_email}
              onChange={(event) => setForm((previous) => ({ ...previous, contact_email: event.target.value }))}
            />
          </label>

          <label className="fullWidth">
            Notas
            <textarea
              value={form.notes}
              onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Crear proveedor"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="filterRow">
          <h2>Listado</h2>

          <div className="filters">
            <select value={countryFilter} onChange={(event) => void handleCountryFilterChange(event.target.value)}>
              <option value="">Todos los paises</option>
              <option value="USA">USA</option>
              <option value="Spain">Spain</option>
            </select>

            <select value={categoryFilter} onChange={(event) => void handleCategoryFilterChange(event.target.value)}>
              <option value="">Todas las categorias</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="resultLabel">{suppliersCountLabel}</p>

        {(error || success) && <div className={error ? "error" : "successMessage"}>{error || success}</div>}

        <div className="suppliersTableWrap">
          <table className="suppliersTable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Pais</th>
                <th>Categorias</th>
                <th>Tarifa</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <strong>{supplier.name}</strong>
                  </td>
                  <td>{supplier.country}</td>
                  <td>{supplier.categories.join(", ")}</td>
                  <td>
                    <div className="rateEditor">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rateDrafts[supplier.id] ?? ""}
                        onChange={(event) =>
                          setRateDrafts((previous) => ({
                            ...previous,
                            [supplier.id]: event.target.value,
                          }))
                        }
                      />
                      <span>{supplier.currency}</span>
                    </div>
                  </td>
                  <td>
                    <span className={supplier.status === "active" ? "statusBadge active" : "statusBadge suspended"}>
                      {supplier.status}
                    </span>
                  </td>
                  <td>
                    <div className="actionStack">
                      <button
                        type="button"
                        disabled={Boolean(rowBusy[supplier.id])}
                        onClick={() => void handleRateUpdate(supplier.id)}
                      >
                        Guardar tarifa
                      </button>

                      <button
                        type="button"
                        className="secondaryButton"
                        disabled={Boolean(rowBusy[supplier.id])}
                        onClick={() => void handleStatusToggle(supplier)}
                      >
                        {supplier.status === "active" ? "Suspender" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
