"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getStageLabel, getStatusLabel } from "@/lib/candidate-labels";
import { createCandidate } from "@/services/api";
import type { CandidateStage, CandidateStatus } from "@/types/models";
import { validateCandidateForm, type CandidateFormErrors, type CandidateFormValues } from "@/lib/candidate-form-validation";

const STATUS_OPTIONS: CandidateStatus[] = ["received", "in_progress", "selected", "discarded"];
const STAGE_OPTIONS: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

const INITIAL_VALUES: CandidateFormValues = {
  name: "",
  email: "",
  phone: "",
  position: "",
  linkedinUrl: "",
  resumeUrl: "",
  yearsOfExperience: "0",
  status: "received",
  stage: "pending",
  appliedAt: new Date().toISOString().slice(0, 10),
};

export default function CreateCandidateForm() {
  const router = useRouter();
  const [values, setValues] = useState<CandidateFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<CandidateFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = <K extends keyof CandidateFormValues>(key: K, value: CandidateFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateCandidateForm(values);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSuccessMessage(null);
      return;
    }

    try {
      setBusy(true);
      setApiError(null);

      await createCandidate({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        position: values.position.trim(),
        linkedinUrl: values.linkedinUrl.trim() || undefined,
        resumeUrl: values.resumeUrl.trim() || undefined,
        yearsOfExperience: Number(values.yearsOfExperience),
        status: values.status,
        stage: values.stage,
        appliedAt: values.appliedAt,
      });

      setValues({
        ...INITIAL_VALUES,
        appliedAt: new Date().toISOString().slice(0, 10),
      });
      setErrors({});
      setSuccessMessage("Candidatura creada correctamente.");
      router.refresh();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo crear la candidatura.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="form-panel" aria-label="Crear candidatura">
      <h2>Nueva candidatura</h2>
      <form onSubmit={handleSubmit} className="form-grid" noValidate>
        <label>
          Nombre completo
          <input
            type="text"
            value={values.name}
            onChange={(event) => {
              handleChange("name", event.target.value);
            }}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label>
          Email
          <input
            type="email"
            value={values.email}
            onChange={(event) => {
              handleChange("email", event.target.value);
            }}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        <label>
          Telefono
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => {
              handleChange("phone", event.target.value);
            }}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </label>

        <label>
          Puesto
          <input
            type="text"
            value={values.position}
            onChange={(event) => {
              handleChange("position", event.target.value);
            }}
            aria-invalid={Boolean(errors.position)}
          />
          {errors.position && <span className="field-error">{errors.position}</span>}
        </label>

        <label>
          LinkedIn (opcional)
          <input
            type="url"
            value={values.linkedinUrl}
            onChange={(event) => {
              handleChange("linkedinUrl", event.target.value);
            }}
            aria-invalid={Boolean(errors.linkedinUrl)}
          />
          {errors.linkedinUrl && <span className="field-error">{errors.linkedinUrl}</span>}
        </label>

        <label>
          URL del CV (opcional)
          <input
            type="url"
            value={values.resumeUrl}
            onChange={(event) => {
              handleChange("resumeUrl", event.target.value);
            }}
            aria-invalid={Boolean(errors.resumeUrl)}
          />
          {errors.resumeUrl && <span className="field-error">{errors.resumeUrl}</span>}
        </label>

        <label>
          Anos de experiencia
          <input
            type="number"
            min={0}
            step={1}
            value={values.yearsOfExperience}
            onChange={(event) => {
              handleChange("yearsOfExperience", event.target.value);
            }}
            aria-invalid={Boolean(errors.yearsOfExperience)}
          />
          {errors.yearsOfExperience && <span className="field-error">{errors.yearsOfExperience}</span>}
        </label>

        <label>
          Fecha de aplicacion
          <input
            type="date"
            value={values.appliedAt}
            onChange={(event) => {
              handleChange("appliedAt", event.target.value);
            }}
            aria-invalid={Boolean(errors.appliedAt)}
          />
          {errors.appliedAt && <span className="field-error">{errors.appliedAt}</span>}
        </label>

        <label>
          Estado
          <select
            value={values.status}
            onChange={(event) => {
              handleChange("status", event.target.value as CandidateStatus);
            }}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
          {errors.status && <span className="field-error">{errors.status}</span>}
        </label>

        <label>
          Etapa
          <select
            value={values.stage}
            onChange={(event) => {
              handleChange("stage", event.target.value as CandidateStage);
            }}
          >
            {STAGE_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {getStageLabel(stage)}
              </option>
            ))}
          </select>
          {errors.stage && <span className="field-error">{errors.stage}</span>}
        </label>

        <div className="form-actions full-row">
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Guardando..." : "Crear candidatura"}
          </button>
        </div>

        {apiError && (
          <p className="feedback-error full-row" role="alert">
            {apiError}
          </p>
        )}
        {successMessage && (
          <p className="feedback-success full-row" role="status">
            {successMessage}
          </p>
        )}
      </form>
    </section>
  );
}
