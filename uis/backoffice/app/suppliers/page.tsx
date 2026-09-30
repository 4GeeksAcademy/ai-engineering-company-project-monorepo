"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

function Sidebar() {
  return (
    <aside className="sidebar">
      <a className="brand" href="/suppliers" aria-label="HealthCore supplier directory">
        <span className="brand-mark" aria-hidden="true">+</span>
        <span><strong>HealthCore</strong><small>Digital workspace</small></span>
      </a>
      <div className="sidebar-section">
        <p className="sidebar-label">Procurement</p>
        <nav className="side-nav"><a className="active" href="/suppliers"><span className="nav-icon" aria-hidden="true">▦</span>Supplier directory</a></nav>
      </div>
      <div className="sidebar-bottom"><div className="compliance-note"><span aria-hidden="true">✓</span><div><strong>Privacy first</strong><small>HIPAA · UK GDPR</small></div></div><p className="sidebar-foot">HealthCore Digital<br /><span>Internal operations</span></p></div>
    </aside>
  );
}

type Supplier = {
  id: number;
  name: string;
  country: "USA" | "UK";
  categories: string[];
  monthly_rate: number;
  currency: "USD" | "GBP";
  updated_at: string;
  status: "active" | "suspended";
  compliance_agreement: "BAA" | "DPA" | "both" | null;
  contract_renewal_date?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

// Use the same-origin Next proxy so browser clients do not need direct access
// to the API host/port (which may not be forwarded in a remote workspace).
const API_URL = "/api";
const CATEGORIES = [
  "medical_supplies", "laboratory_services", "pharmaceutical", "clinical_software",
  "it_infrastructure", "hr_and_payroll_software", "cleaning_and_facilities",
  "patient_communication", "billing_and_coding_software", "training_platforms",
];

type SupplierForm = Omit<Supplier, "id" | "updated_at">;
const emptyForm: SupplierForm = {
  name: "", country: "USA", categories: ["medical_supplies"], monthly_rate: 1, currency: "USD",
  status: "active", compliance_agreement: null, contract_renewal_date: null, contact_email: null, notes: null,
};

function apiError(payload: unknown): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    return Array.isArray(detail)
      ? detail.map((issue) => typeof issue === "object" && issue && "msg" in issue ? String(issue.msg) : String(issue)).join("; ")
      : String(detail);
  }
  return "The API request failed.";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    return params.toString();
  }, [country, category]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/suppliers${query ? `?${query}` : ""}`);
      const body = await response.json();
      if (!response.ok) throw new Error(apiError(body));
      setSuppliers(body as Supplier[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load suppliers. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSuppliers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSuppliers]);

  async function request(path: string, options?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (response.status === 204) return null;
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body));
    return body as Supplier;
  }

  async function registerSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request("/suppliers", { method: "POST", body: JSON.stringify(form) });
      setForm(emptyForm);
      await loadSuppliers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to register supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRate(supplier: Supplier) {
    setError("");
    try {
      const updated = await request(`/suppliers/${supplier.id}/rate`, {
        method: "PATCH", body: JSON.stringify({ monthly_rate: Number(rateDrafts[supplier.id] ?? supplier.monthly_rate) }),
      });
      if (updated) setSuppliers((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update rate.");
    }
  }

  async function changeStatus(supplier: Supplier) {
    setError("");
    try {
      const updated = await request(`/suppliers/${supplier.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status: supplier.status === "active" ? "suspended" : "active" }),
      });
      if (updated) setSuppliers((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update supplier status.");
    }
  }

  function updateCountry(value: "USA" | "UK") {
    setForm((current) => ({ ...current, country: value, currency: value === "USA" ? "USD" : "GBP" }));
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content supplier-page">
        <header className="topbar">
          <div className="breadcrumb"><span>HealthCore Digital</span><span aria-hidden="true">/</span><strong>Supplier directory</strong></div>
          <div className="topbar-actions"><span className="status-dot"><i></i>Supplier registry</span><span className="topbar-divider"></span><span className="user-chip"><span className="avatar">HC</span><span><strong>Digital team</strong><small>Internal operations</small></span></span></div>
        </header>
        <section className="welcome-section supplier-welcome">
          <div><p className="eyebrow">Procurement · Compliance</p><h1>Supplier directory.</h1><p className="welcome-copy">A shared view of HealthCore’s clinical, operational, and technology suppliers.</p></div>
          <div className="welcome-aside"><span className="signal-line" aria-hidden="true"></span><p><strong>USA · UK</strong> contracts<br /><span>Directory sourced from the API</span></p></div>
        </section>

        <section className="supplier-panel panel" aria-labelledby="supplier-list-heading">
          <div className="panel-heading"><div><p className="eyebrow">Supplier registry</p><h2 id="supplier-list-heading">Current suppliers</h2></div><span className="panel-count">{suppliers.length} shown</span></div>
          <div className="supplier-filters">
            <label>Country<select value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All countries</option><option value="USA">USA</option><option value="UK">UK</option></select></label>
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
          </div>
          {error && <div className="supplier-error" role="alert">{error}</div>}
          {loading ? <p className="supplier-empty">Loading suppliers…</p> : suppliers.length === 0 ? <p className="supplier-empty">No suppliers found for the selected filters.</p> : (
            <div className="supplier-table-wrap"><table className="supplier-table"><thead><tr><th>Supplier</th><th>Country</th><th>Categories</th><th>Monthly rate</th><th>Compliance</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{suppliers.map((supplier) => <tr key={supplier.id} className={supplier.status === "suspended" ? "supplier-suspended" : ""}>
                <td><strong>{supplier.name}</strong>{supplier.contact_email && <small>{supplier.contact_email}</small>}</td><td>{supplier.country}</td><td><div className="supplier-category-list">{supplier.categories.map((item) => <span key={item}>{item.replaceAll("_", " ")}</span>)}</div></td>
                <td><div className="supplier-rate"><span>{supplier.currency}</span><input aria-label={`Monthly rate for ${supplier.name}`} type="number" min="0.01" step="0.01" value={rateDrafts[supplier.id] ?? String(supplier.monthly_rate)} onChange={(event) => setRateDrafts((drafts) => ({ ...drafts, [supplier.id]: event.target.value }))} /><button className="supplier-small-button" onClick={() => void updateRate(supplier)}>Save</button></div></td>
                <td>{supplier.compliance_agreement ?? "—"}</td><td><span className={`supplier-status ${supplier.status}`}>{supplier.status}</span></td>
                <td><button className="supplier-small-button" onClick={() => void changeStatus(supplier)}>{supplier.status === "active" ? "Suspend" : "Activate"}</button></td>
              </tr>)}</tbody></table></div>
          )}
        </section>

        <section className="supplier-register panel" aria-labelledby="register-heading">
          <div className="panel-heading"><div><p className="eyebrow">Add to the registry</p><h2 id="register-heading">Register a supplier</h2></div></div>
          <form className="supplier-form" onSubmit={registerSupplier}>
            <label>Supplier name<input required minLength={1} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Country<select value={form.country} onChange={(event) => updateCountry(event.target.value as "USA" | "UK")}><option value="USA">USA</option><option value="UK">UK</option></select></label>
            <label>Monthly rate ({form.currency})<input required type="number" min="0.01" step="0.01" value={form.monthly_rate} onChange={(event) => setForm({ ...form, monthly_rate: Number(event.target.value) })} /></label>
            <label>Categories<select multiple required value={form.categories} onChange={(event) => setForm({ ...form, categories: Array.from(event.target.selectedOptions, (option) => option.value) })}>{CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><small>Use Ctrl/Cmd to select multiple categories.</small></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SupplierForm["status"] })}><option value="active">active</option><option value="suspended">suspended</option></select></label>
            <label>Compliance agreement<select value={form.compliance_agreement ?? ""} onChange={(event) => setForm({ ...form, compliance_agreement: (event.target.value || null) as SupplierForm["compliance_agreement"] })}><option value="">Not applicable / not recorded</option><option value="BAA">BAA</option><option value="DPA">DPA</option><option value="both">both</option></select></label>
            <label>Renewal date<input type="date" value={form.contract_renewal_date ?? ""} onChange={(event) => setForm({ ...form, contract_renewal_date: event.target.value || null })} /></label>
            <label>Contact email<input type="email" value={form.contact_email ?? ""} onChange={(event) => setForm({ ...form, contact_email: event.target.value || null })} /></label>
            <label className="supplier-notes-field">Notes<textarea rows={3} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value || null })} /></label>
            <button className="button supplier-submit" type="submit" disabled={saving}>{saving ? "Registering…" : "Register supplier"}<span aria-hidden="true">→</span></button>
          </form>
        </section>
        <footer className="main-footer"><span>HealthCore Digital · Supplier directory</span><span>Contract currency is determined by supplier country.</span></footer>
      </main>
    </div>
  );
}
