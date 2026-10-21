
"use client";

import { useState, type FormEvent } from "react";
import { createIncident, IncidentApiError } from "./api";
import {
  BRANCHES,
  CATEGORIES,
  ORIGINS,
  STATUSES,
  type Incident,
  type IncidentInput,
} from "./types";

type Props = {
  onCreated: (incident: Incident) => void;
};

const initialForm: IncidentInput = {
  title: "",
  description: "",
  category: "customer_complaint",
  status: "open",
  origin: "customer",
  branch: "central",
};

const inputStyle = {
  width: "100%",
  minHeight: 46,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbbfb5",
  background: "white",
};

export default function IncidentForm({ onCreated }: Props) {
  const [form, setForm] = useState<IncidentInput>({
    ...initialForm,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  function updateField(
    field: keyof IncidentInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    const errors: Record<string, string> = {};

    if (!form.title.trim()) {
      errors.title = "Introduce un título.";
    }

    if (!form.description.trim()) {
      errors.description = "Introduce una descripción.";
    }

    if (!form.branch) {
      errors.branch = "Selecciona una sede.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const created = await createIncident({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      });

      setForm({ ...initialForm });
      onCreated(created);
    } catch (err) {
      if (err instanceof IncidentApiError) {
        if (err.field) {
          setFieldErrors({
            [err.field]: err.message,
          });
        } else {
          setError(err.message);
        }
      } else {
        setError("No se pudo registrar la incidencia.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        background: "white",
        padding: 24,
        borderRadius: 14,
        marginBottom: 24,
        border: "1px solid #e5dcd5",
      }}
    >
      <h2>Nueva incidencia</h2>
      <p>Registra un problema operativo o una queja de cliente.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 18 }}>
          <label>
            <strong>Título *</strong>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) =>
                updateField("title", e.target.value)
              }
              placeholder="Ej. Horno averiado"
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title && (
              <p role="alert" style={{ color: "#b42318" }}>
                {fieldErrors.title}
              </p>
            )}
          </label>

          <label>
            <strong>Descripción *</strong>
            <textarea
              style={{ ...inputStyle, minHeight: 110 }}
              value={form.description}
              onChange={(e) =>
                updateField("description", e.target.value)
              }
              placeholder="Describe lo ocurrido..."
              aria-invalid={Boolean(fieldErrors.description)}
            />
            {fieldErrors.description && (
              <p role="alert" style={{ color: "#b42318" }}>
                {fieldErrors.description}
              </p>
            )}
          </label>

          <label>
            <strong>Categoría *</strong>
            <select
              style={inputStyle}
              value={form.category}
              onChange={(e) =>
                updateField("category", e.target.value)
              }
            >
              {Object.entries(CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p role="alert" style={{ color: "#b42318" }}>
                {fieldErrors.category}
              </p>
            )}
          </label>

          <label>
            <strong>Origen *</strong>
            <select
              style={inputStyle}
              value={form.origin}
              onChange={(e) =>
                updateField("origin", e.target.value)
              }
            >
              {Object.entries(ORIGINS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {fieldErrors.origin && (
              <p role="alert" style={{ color: "#b42318" }}>
                {fieldErrors.origin}
              </p>
            )}
          </label>

          <label>
            <strong>
              Sede * {form.origin === "branch" ? "📍" : ""}
            </strong>

            {form.origin === "branch" && (
              <p style={{ color: "#a34c00" }}>
                Indica la sede que reporta la incidencia.
              </p>
            )}

            <select
              style={{
                ...inputStyle,
                border:
                  form.origin === "branch"
                    ? "2px solid #d97706"
                    : "1px solid #cbbfb5",
              }}
              value={form.branch}
              onChange={(e) =>
                updateField("branch", e.target.value)
              }
              aria-invalid={Boolean(fieldErrors.branch)}
            >
              {Object.entries(BRANCHES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {fieldErrors.branch && (
              <p role="alert" style={{ color: "#b42318" }}>
                {fieldErrors.branch}
              </p>
            )}
          </label>

          <label>
            <strong>Estado *</strong>
            <select
              style={inputStyle}
              value={form.status}
              onChange={(e) =>
                updateField("status", e.target.value)
              }
            >
              {Object.entries(STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {fieldErrors.status && (
              <p role="alert" style={{ color: "#b42318" }}>
                {fieldErrors.status}
              </p>
            )}
          </label>

          {error && (
            <p role="alert" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px 20px",
              background: "#963f25",
              color: "white",
              border: 0,
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "Guardando..." : "Registrar incidencia"}
          </button>
        </div>
      </form>
    </section>
  );
}
