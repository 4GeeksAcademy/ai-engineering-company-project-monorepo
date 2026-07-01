"use client";

import { useState } from "react";
import Alert from "@/components/Alert";
import type { RecordCreate, RecordOut } from "@/types";

type FormErrors = Partial<Record<keyof RecordCreate, string>>;

function validateForm(values: RecordCreate): FormErrors {
  const errors: FormErrors = {};

  if (!values.full_name.trim()) {
    errors.full_name = "El nombre completo es obligatorio.";
  }

  if (!values.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Ingresa un email válido.";
  }

  if (!values.phone.trim()) {
    errors.phone = "El teléfono es obligatorio.";
  }

  if (!values.position.trim()) {
    errors.position = "El puesto es obligatorio.";
  }

  if (values.experience_years < 0 || Number.isNaN(values.experience_years)) {
    errors.experience_years = "Los años de experiencia deben ser 0 o más.";
  }

  if (values.linkedin_url?.trim()) {
    try {
      new URL(values.linkedin_url);
    } catch {
      errors.linkedin_url = "Ingresa una URL de LinkedIn válida.";
    }
  }

  if (values.cv_url?.trim()) {
    try {
      new URL(values.cv_url);
    } catch {
      errors.cv_url = "Ingresa una URL de CV válida.";
    }
  }

  return errors;
}

const emptyValues: RecordCreate = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: 0,
};

function toFormValues(candidate?: RecordOut): RecordCreate {
  if (!candidate) return emptyValues;

  return {
    full_name: candidate.full_name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    linkedin_url: candidate.linkedin_url ?? "",
    cv_url: candidate.cv_url ?? "",
    experience_years: candidate.experience_years,
  };
}

export default function CandidateForm({
  mode,
  initialData,
  onSubmit,
  onCreateSuccess,
}: {
  mode: "create" | "edit";
  initialData?: RecordOut;
  onSubmit: (data: RecordCreate) => Promise<void | RecordOut>;
  onCreateSuccess?: (id: string) => void;
}) {
  const [values, setValues] = useState<RecordCreate>(() =>
    toFormValues(initialData),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    field: keyof RecordCreate,
    value: string | number,
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: RecordCreate = {
      ...values,
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      position: values.position.trim(),
      linkedin_url: values.linkedin_url?.trim() || null,
      cv_url: values.cv_url?.trim() || null,
      experience_years: Number(values.experience_years),
    };

    const validationErrors = validateForm(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const result = await onSubmit(payload);
      setSuccessMessage(
        mode === "create"
          ? "Candidatura registrada correctamente."
          : "Candidatura actualizada correctamente.",
      );
      if (mode === "create" && result?.id && onCreateSuccess) {
        setTimeout(() => onCreateSuccess(result.id), 1500);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la candidatura.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="full_name"
          label="Nombre completo"
          required
          value={values.full_name}
          error={errors.full_name}
          onChange={(v) => handleChange("full_name", v)}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          required
          value={values.email}
          error={errors.email}
          onChange={(v) => handleChange("email", v)}
        />
        <Field
          id="phone"
          label="Teléfono"
          required
          value={values.phone}
          error={errors.phone}
          onChange={(v) => handleChange("phone", v)}
        />
        <Field
          id="position"
          label="Puesto"
          required
          value={values.position}
          error={errors.position}
          onChange={(v) => handleChange("position", v)}
        />
        <Field
          id="experience_years"
          label="Años de experiencia"
          type="number"
          required
          min={0}
          value={String(values.experience_years)}
          error={errors.experience_years}
          onChange={(v) => handleChange("experience_years", Number(v))}
        />
        <Field
          id="linkedin_url"
          label="LinkedIn"
          value={values.linkedin_url ?? ""}
          error={errors.linkedin_url}
          onChange={(v) => handleChange("linkedin_url", v)}
        />
        <Field
          id="cv_url"
          label="Enlace al CV"
          className="sm:col-span-2"
          value={values.cv_url ?? ""}
          error={errors.cv_url}
          onChange={(v) => handleChange("cv_url", v)}
        />
      </div>

      {submitError && <Alert variant="error" message={submitError} />}
      {successMessage && <Alert variant="success" message={successMessage} />}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Guardando..."
          : mode === "create"
            ? "Registrar candidatura"
            : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  required,
  min,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  min?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
