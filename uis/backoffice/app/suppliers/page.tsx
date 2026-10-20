"use client";

import { type FormEvent, useEffect, useState } from "react";
import "./suppliers.css";

type Supplier = {
  id: number;
  name: string;
  country: "USA" | "Spain";
  categories: string[];
  rate_per_shipment: number;
  currency: "USD" | "EUR";
  updated_at: string;
  status: "active" | "suspended";
  service_zone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

const categories = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities",
];
const categoryLabels: Record<string, string> = {
  carrier_last_mile: "Carrier última milla",
  carrier_international: "Carrier internacional",
  warehouse_supplies: "Suministros de almacén",
  packaging_materials: "Materiales de embalaje",
  reverse_logistics: "Logística inversa",
  fleet_maintenance: "Mantenimiento de flota",
  it_and_wms_software: "Software IT / WMS",
  cleaning_and_facilities: "Limpieza e instalaciones",
};

function formatRate(rate: number, currency: Supplier["currency"]) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(rate);
}

function formatCountry(country: Supplier["country"]) {
  return country === "USA" ? "Estados Unidos" : "España";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [newCountry, setNewCountry] = useState<"USA" | "Spain">("USA");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [rate, setRate] = useState("");
  const [serviceZone, setServiceZone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    const query = params.toString();
    fetch(`/api/suppliers${query ? `?${query}` : ""}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el directorio.");
        return response.json() as Promise<Supplier[]>;
      })
      .then(setSuppliers)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Error de conexion con la API.");
      })
      .finally(() => setIsLoading(false));
  }, [country, category]);

  function toggleCategory(selected: string) {
    setNewCategories((current) => current.includes(selected)
      ? current.filter((item) => item !== selected)
      : [...current, selected]);
  }

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country: newCountry,
          categories: newCategories,
          rate_per_shipment: Number(rate),
          currency: newCountry === "USA" ? "USD" : "EUR",
          status: "active",
          service_zone: serviceZone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail?.[0]?.msg ?? body.detail ?? "No se pudo registrar el proveedor.");
      if ((!country || country === newCountry) && (!category || newCategories.includes(category))) {
        setSuppliers((current) => [body as Supplier, ...current]);
      }
      setName("");
      setNewCategories([]);
      setRate("");
      setServiceZone("");
      setContactEmail("");
      setNotes("");
      setNotice("Proveedor registrado.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de conexion con la API.");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateRate(supplier: Supplier) {
    const value = Number(rateDrafts[supplier.id] ?? supplier.rate_per_shipment);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate_per_shipment: value }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail?.[0]?.msg ?? body.detail ?? "No se pudo actualizar la tarifa.");
      setSuppliers((current) => current.map((item) => item.id === supplier.id ? body as Supplier : item));
      setRateDrafts((current) => {
        const drafts = { ...current };
        delete drafts[supplier.id];
        return drafts;
      });
      setNotice(`Tarifa de ${supplier.name} actualizada.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de conexion con la API.");
    }
  }

  async function toggleStatus(supplier: Supplier) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: supplier.status === "active" ? "suspended" : "active" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail?.[0]?.msg ?? body.detail ?? "No se pudo cambiar el estado.");
      setSuppliers((current) => current.map((item) => item.id === supplier.id ? body as Supplier : item));
      setNotice(`${supplier.name}: ${body.status === "active" ? "activo" : "suspendido"}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de conexion con la API.");
    }
  }

  return (
    <>
      <header className="topbar supplier-header">
        <div><p className="kicker">OPERACIONES / COMPRAS</p><h1>Directorio de proveedores</h1></div>
        <span className="supplier-count">{suppliers.length} proveedores</span>
      </header>

      <section className="supplier-intro">
        <div><h2>Red operativa</h2><p>Consulta cobertura, servicios y tarifas vigentes de los partners de TrackFlow.</p></div>
        <div className="supplier-filters">
          <label>País<select value={country} onChange={(event) => setCountry(event.target.value)}><option value="">Todos</option><option value="USA">Estados Unidos</option><option value="Spain">España</option></select></label>
          <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
        </div>
      </section>

      {error && <p className="supplier-alert" role="alert">{error}</p>}
      {notice && <p className="supplier-notice" role="status">{notice}</p>}

      <section className="supplier-list" aria-label="Listado de proveedores">
        <div className="supplier-table-wrap"><table><thead><tr><th>PROVEEDOR / CONTACTO</th><th>PAÍS</th><th>ZONA</th><th>CATEGORÍAS</th><th>TARIFA / UNIDAD</th><th>ESTADO</th><th>ACTUALIZADO</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="supplier-empty">Cargando directorio...</td></tr>}
            {!isLoading && suppliers.map((supplier) => <tr key={supplier.id}>
              <td><strong>{supplier.name}</strong>{supplier.contact_email && <a className="supplier-contact" href={`mailto:${supplier.contact_email}`}>{supplier.contact_email}</a>}{supplier.notes && <small className="supplier-notes" title={supplier.notes}>{supplier.notes}</small>}<small className="supplier-id">ID {supplier.id}</small></td>
              <td><span className="country-dot" />{formatCountry(supplier.country)}<small className="supplier-id">{supplier.currency}</small></td>
              <td>{supplier.service_zone ?? <span className="supplier-unspecified">Sin zona definida</span>}</td>
              <td><div className="service-tags">{supplier.categories.map((item) => <span key={item}>{categoryLabels[item] ?? item}</span>)}</div></td>
              <td><div className="rate-control"><input aria-label={`Nueva tarifa para ${supplier.name}`} type="number" min="0.01" step="0.01" value={rateDrafts[supplier.id] ?? supplier.rate_per_shipment} onChange={(event) => setRateDrafts((current) => ({ ...current, [supplier.id]: event.target.value }))} /><button type="button" onClick={() => updateRate(supplier)}>Guardar</button></div><small className="rate-current">Vigente: {formatRate(supplier.rate_per_shipment, supplier.currency)}</small></td>
              <td><button type="button" className={`supplier-status ${supplier.status}`} onClick={() => toggleStatus(supplier)} aria-label={`${supplier.status === "active" ? "Suspender" : "Activar"} a ${supplier.name}`}>{supplier.status === "active" ? "Activo" : "Suspendido"}</button></td>
              <td><time dateTime={supplier.updated_at}>{new Date(supplier.updated_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</time></td>
            </tr>)}
            {!isLoading && suppliers.length === 0 && <tr><td colSpan={7} className="supplier-empty">No hay proveedores para estos filtros.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="supplier-create">
        <div className="supplier-create-heading"><div><p className="kicker">ALTA DE PARTNER</p><h2>Registrar proveedor</h2></div><span>Los campos con * son obligatorios</span></div>
        <form onSubmit={createSupplier}>
          <label className="supplier-name-field">Nombre del proveedor *<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre comercial" /></label>
          <label>País *<select value={newCountry} onChange={(event) => setNewCountry(event.target.value as "USA" | "Spain")}><option value="USA">Estados Unidos (USA)</option><option value="Spain">España</option></select></label>
          <label>Tarifa por envío o unidad *<input required type="number" min="0.01" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="0.00" /><small className="supplier-field-hint">Moneda del contrato: {newCountry === "USA" ? "USD" : "EUR"}</small></label>
          <label className="supplier-extra-field">Zona de servicio<input maxLength={120} value={serviceZone} onChange={(event) => setServiceZone(event.target.value)} placeholder="Opcional" /></label>
          <label className="supplier-extra-field">Email de contacto<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contacto@empresa.com" /></label>
          <fieldset><legend>Categorías *</legend><div className="supplier-category-options">{categories.map((item) => <label key={item}><input type="checkbox" checked={newCategories.includes(item)} onChange={() => toggleCategory(item)} />{categoryLabels[item]}</label>)}</div></fieldset>
          <label className="supplier-notes-field">Notas de operaciones<textarea maxLength={1000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
          <button className="primary-button" type="submit" disabled={isCreating || newCategories.length === 0}>{isCreating ? "Guardando..." : "Registrar proveedor"}</button>
        </form>
      </section>
    </>
  );
}