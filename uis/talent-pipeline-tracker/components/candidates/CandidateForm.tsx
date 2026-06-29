"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Candidate, CandidateCreate } from "@/lib/types";
import { createRecord, updateRecord } from "@/lib/api";

interface CandidateFormProps {
  open: boolean;
  candidate?: Candidate | null;
  onClose: () => void;
  onSaved: (candidate: Candidate) => void;
}

type FormErrors = Partial<Record<keyof CandidateCreate, string>>;

export function CandidateForm({
  open,
  candidate,
  onClose,
  onSaved,
}: CandidateFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg mx-auto mt-5 rounded-xl border border-white/10 bg-slate-900 p-6 text-slate-100 backdrop:bg-black/60"
    >
      <h2 className="text-lg font-semibold">
        {candidate ? "Editar candidatura" : "Nueva candidatura"}
      </h2>

      {feedback && (
        <div
          className={`mt-3 rounded-md px-4 py-2 text-sm ${
            feedback.type === "success"
              ? "bg-green-500/20 text-green-300"
              : "bg-red-500/20 text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <FormContent
        key={candidate?.id ?? "new"}
        candidate={candidate}
        onSaved={(saved) => {
          setFeedback({ type: "success", message: "Guardado correctamente" });
          setTimeout(() => {
            onSaved(saved);
            onClose();
          }, 800);
        }}
        onError={(message) => setFeedback({ type: "error", message })}
      />
    </dialog>
  );
}

function FormContent({
  candidate,
  onSaved,
  onError,
}: {
  candidate?: Candidate | null;
  onSaved: (candidate: Candidate) => void;
  onError: (message: string) => void;
}) {
  const isEdit = !!candidate;
  const [form, setForm] = useState<CandidateCreate>(() =>
    candidate
      ? {
          full_name: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          position: candidate.position,
          experience_years: candidate.experience_years,
          linkedin_url: candidate.linkedin_url ?? "",
          cv_url: candidate.cv_url ?? "",
        }
      : {
          full_name: "",
          email: "",
          phone: "",
          position: "",
          experience_years: 0,
          linkedin_url: "",
          cv_url: "",
        },
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!form.full_name.trim()) e.full_name = "El nombre es obligatorio";
    if (!form.email.trim()) e.email = "El email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email no válido";
    if (!form.phone.trim()) e.phone = "El teléfono es obligatorio";
    if (!form.position.trim()) e.position = "El puesto es obligatorio";
    if (
      form.experience_years === undefined ||
      form.experience_years < 0 ||
      form.experience_years > 50
    )
      e.experience_years = "Años de experiencia inválidos (0-50)";
    return e;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload: CandidateCreate = {
        ...form,
        linkedin_url: form.linkedin_url || null,
        cv_url: form.cv_url || null,
      };
      const saved = isEdit
        ? await updateRecord(candidate!.id, payload)
        : await createRecord(payload);
      onSaved(saved);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof CandidateCreate, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <Field label="Nombre completo" error={errors.full_name} required>
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <Field label="Email" error={errors.email} required>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <Field label="Teléfono" error={errors.phone} required>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <Field label="Puesto" error={errors.position} required>
        <input
          type="text"
          value={form.position}
          onChange={(e) => set("position", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <Field label="Años de experiencia" error={errors.experience_years} required>
        <input
          type="number"
          min={0}
          max={50}
          value={form.experience_years}
          onChange={(e) => set("experience_years", Number(e.target.value))}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <Field label="LinkedIn (URL)">
        <input
          type="url"
          value={form.linkedin_url ?? ""}
          onChange={(e) => set("linkedin_url", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <Field label="CV (URL)">
        <input
          type="url"
          value={form.cv_url ?? ""}
          onChange={(e) => set("cv_url", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            const el = document.querySelector("dialog[open]");
            if (el instanceof HTMLDialogElement) el.close();
          }}
          className="rounded-md border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {submitting ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </label>
  );
}
