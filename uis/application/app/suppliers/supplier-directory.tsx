"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  COUNTRIES,
  PRODUCT_CATEGORIES,
  STATUSES,
  api,
  type Supplier,
  type SupplierInput,
} from "../../lib/suppliers";

type FormState = SupplierInput & { supplierId: string };

const emptyForm = (): FormState => ({
  supplierId: "",
  name: "",
  country: "Colombia",
  product_categories: ["proteins"],
  emergency_surcharge_pct: 8,
  status: "active",
});

function rowKind(status: string): string {
  return status === "inactive" ? "suspended" : status;
}

function badgeLabel(status: string): string {
  return status === "inactive" ? "suspended" : status;
}

export function SupplierDirectory() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [listMessage, setListMessage] = useState("Loading suppliers...");
  const [listError, setListError] = useState(false);
  const [filterCountry, setFilterCountry] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("country") ?? "",
  );
  const [filterCategory, setFilterCategory] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("category") ?? "",
  );
  const [filterStatus, setFilterStatus] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("status") ?? "",
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});

  const loadSuppliers = useCallback(async () => {
    setListMessage("Loading suppliers...");
    setListError(false);
    const params = new URLSearchParams();
    if (filterCountry) params.set("country", filterCountry);
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    const query = params.toString();
    try {
      const data = await api<Supplier[]>(`/suppliers${query ? `?${query}` : ""}`);
      setRows(data);
      setRateDrafts(Object.fromEntries(data.map((row) => [row.id, String(row.emergency_surcharge_pct)])));
      setListMessage(`${data.length} supplier${data.length === 1 ? "" : "s"}`);
    } catch (error) {
      setRows([]);
      setListError(true);
      setListMessage(error instanceof Error ? error.message : "Could not load suppliers.");
    }
  }, [filterCategory, filterCountry, filterStatus]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  function applyUpdated(updated: Supplier) {
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    setRateDrafts((current) => ({ ...current, [updated.id]: String(updated.emergency_surcharge_pct) }));
  }

  async function patchStatus(lookup: string | number, nextStatus: "active" | "suspend") {
    const updated = await api<Supplier>(`/suppliers/${encodeURIComponent(String(lookup))}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    applyUpdated(updated);
    const action = nextStatus === "suspend" ? "suspended (stored as inactive)" : "activated";
    setListMessage(`${updated.name}: ${action} — status is ${updated.status}.`);
    setListError(false);
    if (form.supplierId === updated.supplier_id) {
      setForm((current) => ({ ...current, status: updated.status }));
    }
    return updated;
  }

  async function updateRate(row: Supplier) {
    const updated = await api<Supplier>(`/suppliers/${encodeURIComponent(String(row.id))}/rate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergency_surcharge_pct: Number(rateDrafts[row.id]) }),
    });
    applyUpdated(updated);
    setListMessage(`${updated.name}: emergency_surcharge_pct is now ${updated.emergency_surcharge_pct}.`);
    setListError(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: SupplierInput = {
      name: form.name.trim(),
      country: form.country,
      product_categories: form.product_categories,
      emergency_surcharge_pct: Number(form.emergency_surcharge_pct),
      status: form.status,
    };
    setFormError(false);
    setFormMessage(form.supplierId ? "Saving changes..." : "Registering supplier...");
    try {
      if (form.supplierId) {
        await api(`/suppliers/${encodeURIComponent(form.supplierId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await loadSuppliers();
        setForm(emptyForm());
        setFormMessage(`Updated ${form.supplierId}.`);
        return;
      }
      const created = await api<Supplier>("/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadSuppliers();
      setForm(emptyForm());
      setFormMessage(`Registered ${created.name} (${created.supplier_id}).`);
    } catch (error) {
      setFormError(true);
      setFormMessage(error instanceof Error ? error.message : "The API rejected this supplier.");
    }
  }

  const editing = Boolean(form.supplierId);

  return (
    <>
      <p className="subtitle">
        Brasaland procurement directory. Columns use CONTEXT fields: <code>name</code>, <code>country</code>,{" "}
        <code>product_categories</code>, <code>emergency_surcharge_pct</code> (rate), and <code>status</code>.
      </p>
      <div id="directory-panel">
        <section className="card" aria-labelledby="list-heading">
          <div className="section-header">
            <h2 id="list-heading">All suppliers</h2>
            <span id="list-status" className={listError ? "text-error" : "status-busy"} role="status">
              {listMessage}
            </span>
          </div>
          <div className="filter-row">
            <label htmlFor="filter-country">
              Country
              <select
                id="filter-country"
                value={filterCountry}
                onChange={(event) => setFilterCountry(event.target.value)}
              >
                <option value="">All countries</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="filter-category">
              Product category
              <select
                id="filter-category"
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="filter-status">
              Status
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-actions">
              <button type="button" className="btn-primary" id="apply-filters" onClick={() => void loadSuppliers()}>
                Apply filters
              </button>
              <button
                type="button"
                className="btn-secondary"
                id="reset-filters"
                onClick={() => {
                  setFilterCountry("");
                  setFilterCategory("");
                  setFilterStatus("");
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table id="supplier-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Categories</th>
                  <th>
                    Emergency surcharge % (<code>emergency_surcharge_pct</code>)
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="supplier-body">
                {listError ? (
                  <tr>
                    <td colSpan={6} className="text-error">
                      {listMessage}
                    </td>
                  </tr>
                ) : !rows.length ? (
                  <tr>
                    <td colSpan={6}>No suppliers match these filters.</td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const suspended = row.status === "inactive";
                    return (
                      <tr
                        key={row.id}
                        className={`supplier-row supplier-row--${rowKind(row.status)}`}
                        data-id={row.id}
                        data-supplier-id={row.supplier_id}
                      >
                        <td>
                          <strong>{row.name}</strong>
                          <span
                            className={`status-pill status-${row.status}${suspended ? " status-suspended" : ""}`}
                            title={`CONTEXT status: ${row.status}`}
                          >
                            {badgeLabel(row.status)}
                          </span>
                        </td>
                        <td>{row.country}</td>
                        <td>{(row.product_categories || []).join(", ")}</td>
                        <td>
                          <div className="rate-update">
                            <input
                              type="number"
                              step="0.01"
                              data-rate-input
                              value={rateDrafts[row.id] ?? ""}
                              aria-label={`emergency_surcharge_pct for ${row.name}`}
                              onChange={(event) =>
                                setRateDrafts((current) => ({ ...current, [row.id]: event.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="btn-primary btn-compact"
                              data-action="update-rate"
                              onClick={() =>
                                updateRate(row).catch((error) => {
                                  setListError(true);
                                  setListMessage(error instanceof Error ? error.message : "The API rejected this rate.");
                                })
                              }
                            >
                              Update rate
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="status-controls">
                            <span
                              className={`status-pill status-${row.status}${suspended ? " status-suspended" : ""}`}
                              title={`CONTEXT status: ${row.status}`}
                            >
                              {badgeLabel(row.status)}
                            </span>
                            <button
                              type="button"
                              className="btn-primary btn-compact"
                              data-action="set-status"
                              data-status="active"
                              disabled={row.status === "active"}
                              onClick={() =>
                                patchStatus(row.id, "active").catch((error) => {
                                  setListError(true);
                                  setListMessage(error instanceof Error ? error.message : "The API rejected this status.");
                                })
                              }
                            >
                              Activate
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-compact"
                              data-action="set-status"
                              data-status="suspend"
                              disabled={row.status === "inactive"}
                              onClick={() =>
                                patchStatus(row.id, "suspend").catch((error) => {
                                  setListError(true);
                                  setListMessage(error instanceof Error ? error.message : "The API rejected this status.");
                                })
                              }
                            >
                              Suspend
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary btn-compact"
                            data-action="edit"
                            onClick={() =>
                              setForm({
                                supplierId: row.supplier_id,
                                name: row.name,
                                country: row.country,
                                product_categories: row.product_categories,
                                emergency_surcharge_pct: row.emergency_surcharge_pct,
                                status: row.status,
                              })
                            }
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" aria-labelledby="form-title">
          <div className="section-header">
            <h2 id="form-title">{editing ? `Edit ${form.supplierId}` : "Register a new supplier"}</h2>
            {editing ? (
              <button type="button" className="btn-secondary" id="cancel-edit" onClick={() => setForm(emptyForm())}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <form id="supplier-form" className="ticket-form" noValidate onSubmit={onSubmit}>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <label htmlFor="country">Country</label>
            <select id="country" name="country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <fieldset className="location-fieldset">
              <legend>Product categories</legend>
              <div id="category-checkboxes" className="checkbox-grid">
                {PRODUCT_CATEGORIES.map((category) => (
                  <label key={category} className="checkbox-item">
                    <input
                      type="checkbox"
                      name="product_categories"
                      value={category}
                      checked={form.product_categories.includes(category)}
                      onChange={(event) => {
                        const selected = event.target.checked
                          ? [...form.product_categories, category]
                          : form.product_categories.filter((item) => item !== category);
                        setForm({ ...form, product_categories: selected, emergency_surcharge_pct: 8 });
                      }}
                    />{" "}
                    {category}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="emergency_surcharge_pct">
              Emergency surcharge % (<code>emergency_surcharge_pct</code>)
            </label>
            <input
              id="emergency_surcharge_pct"
              name="emergency_surcharge_pct"
              type="number"
              step="0.01"
              value={form.emergency_surcharge_pct}
              onChange={(event) => setForm({ ...form, emergency_surcharge_pct: Number(event.target.value) })}
            />
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {editing ? (
              <div id="status-lifecycle" className="status-controls">
                <button
                  type="button"
                  className="btn-primary btn-compact"
                  id="activate-supplier"
                  data-action="set-status"
                  data-status="active"
                  onClick={() =>
                    patchStatus(form.supplierId, "active")
                      .then((updated) => setFormMessage(`Status updated to ${updated.status}.`))
                      .catch((error) => {
                        setFormError(true);
                        setFormMessage(error instanceof Error ? error.message : "The API rejected this status.");
                      })
                  }
                >
                  Activate
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-compact"
                  id="suspend-supplier"
                  data-action="set-status"
                  data-status="suspend"
                  onClick={() =>
                    patchStatus(form.supplierId, "suspend")
                      .then((updated) => setFormMessage(`Status updated to ${updated.status}.`))
                      .catch((error) => {
                        setFormError(true);
                        setFormMessage(error instanceof Error ? error.message : "The API rejected this status.");
                      })
                  }
                >
                  Suspend
                </button>
              </div>
            ) : null}
            <button type="submit" className="btn-primary" id="register-supplier">
              {editing ? "Save changes" : "Register supplier"}
            </button>
            <p id="form-status" className={formError ? "alert-error" : "status-busy"} role="alert" aria-live="polite">
              {formMessage}
            </p>
          </form>
        </section>
      </div>
    </>
  );
}
