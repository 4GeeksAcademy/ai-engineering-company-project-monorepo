"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCandidate, updateCandidate } from "@/lib/api";
import FormField from "../FormField";
import Toast from "../Toast";
import {
  EMPTY_FORM,
  formStateFromCandidate,
  toRecordCreate,
  validate,
} from "@/lib/candidate-form";
import type { FormErrors, FormState } from "@/lib/candidate-form";
import type { Candidate } from "@/lib/types";

interface CandidateFormProps {
  mode: "create" | "edit";
  /** Only required when mode === "edit" */
  candidate?: Candidate;
}

export default function CandidateForm({ mode, candidate }: CandidateFormProps) {
  const router = useRouter();

  const isEdit = mode === "edit";
  const candidateId = candidate?.id;

  const [form, setForm] = useState<FormState>(() =>
    candidate ? formStateFromCandidate(candidate) : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear a field's error as the user fixes it
    setErrors((prev) =>
      prev[field] ? { ...prev, [field]: undefined } : prev,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validate(form);
    setErrors(nextErrors);
    setToast(null);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const payload = toRecordCreate(form);

    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateCandidate(candidateId!, payload)
        : await createCandidate(payload);

      setToast({
        kind: "success",
        message: isEdit
          ? "Candidate updated successfully."
          : "Candidate created successfully.",
      });

      // Navigate after a short delay so the user sees the toast
      setTimeout(() => {
        router.push(`/candidates/${saved.id}`);
        router.refresh();
      }, 800);
    } catch (err) {
      setToast({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to submit candidate.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {toast && <Toast kind={toast.kind} message={toast.message} />}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
          {isEdit ? "Edit candidate" : "New candidate"}
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2"
        >
          <FormField
            label="Full name"
            required
            type="text"
            value={form.full_name}
            onChange={(e) => setField("full_name", e.target.value)}
            placeholder="Jane Doe"
            error={errors.full_name}
            className="sm:col-span-2"
          />

          <FormField
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="jane@example.com"
            error={errors.email}
            className="sm:col-span-2"
          />

          <FormField
            label="Phone"
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+1 555 000 1234"
            error={errors.phone}
          />

          <FormField
            label="Position"
            required
            type="text"
            value={form.position}
            onChange={(e) => setField("position", e.target.value)}
            placeholder="Frontend Developer"
            error={errors.position}
          />

          <FormField
            label="Experience years"
            required
            type="number"
            min="0"
            step="0.5"
            value={form.experience_years}
            onChange={(e) => setField("experience_years", e.target.value)}
            error={errors.experience_years}
          />

          <FormField
            label="LinkedIn URL"
            type="url"
            value={form.linkedin_url}
            onChange={(e) => setField("linkedin_url", e.target.value)}
            placeholder="https://linkedin.com/in/jane"
            error={errors.linkedin_url}
          />

          <FormField
            label="CV URL"
            type="url"
            value={form.cv_url}
            onChange={(e) => setField("cv_url", e.target.value)}
            placeholder="https://example.com/jane-cv.pdf"
          />

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 sm:col-span-2">
            <Link
              href={isEdit && candidateId ? `/candidates/${candidateId}` : "/"}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create candidate"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}