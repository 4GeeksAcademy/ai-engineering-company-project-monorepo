"use client";

import { FormEvent, useMemo, useState } from "react";
import { CandidateInput } from "@/types/records";

interface CandidateFormProps {
  mode: "create" | "edit";
  initialValues?: CandidateInput;
  onSubmit: (payload: CandidateInput) => Promise<void>;
  submitLabel: string;
}

interface CandidateFormState {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
}

const EMPTY_STATE: CandidateFormState = {
  full_name: "",
  email: "",
  phone: "",
  position: "Executive Assistant",
  linkedin_url: "",
  cv_url: "",
  experience_years: "",
};

function toState(values?: CandidateInput): CandidateFormState {
  if (!values) {
    return EMPTY_STATE;
  }

  return {
    full_name: values.full_name,
    email: values.email,
    phone: values.phone,
    position: values.position,
    linkedin_url: values.linkedin_url ?? "",
    cv_url: values.cv_url ?? "",
    experience_years: String(values.experience_years),
  };
}

export function CandidateForm({ mode, initialValues, onSubmit, submitLabel }: CandidateFormProps) {
  const [form, setForm] = useState<CandidateFormState>(toState(initialValues));
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const title = useMemo(
    () => (mode === "create" ? "Register candidate" : "Edit candidate profile"),
    [mode],
  );

  function validate(state: CandidateFormState): string[] {
    const nextErrors: string[] = [];

    if (!state.full_name.trim()) nextErrors.push("Full name is required.");
    if (!state.email.trim()) nextErrors.push("Email is required.");
    if (!state.phone.trim()) nextErrors.push("Phone is required.");
    if (!state.position.trim()) nextErrors.push("Position is required.");
    if (!state.experience_years.trim()) nextErrors.push("Years of experience is required.");

    const years = Number(state.experience_years);
    if (state.experience_years.trim() && (Number.isNaN(years) || years < 0)) {
      nextErrors.push("Years of experience must be zero or a positive number.");
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      return;
    }

    const payload: CandidateInput = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      position: form.position.trim(),
      linkedin_url: form.linkedin_url.trim() || null,
      cv_url: form.cv_url.trim() || null,
      experience_years: Number(form.experience_years),
    };

    setIsSubmitting(true);

    try {
      await onSubmit(payload);
      setFeedback({
        type: "success",
        message: mode === "create" ? "Candidate registered successfully." : "Candidate updated successfully.",
      });

      if (mode === "create") {
        setForm(EMPTY_STATE);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm text-slate-700">
          Full name *
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.full_name}
            onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Email *
          <input
            type="email"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Phone *
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          Position *
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.position}
            onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          LinkedIn URL
          <input
            type="url"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.linkedin_url}
            onChange={(event) => setForm((prev) => ({ ...prev, linkedin_url: event.target.value }))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700">
          CV URL
          <input
            type="url"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.cv_url}
            onChange={(event) => setForm((prev) => ({ ...prev, cv_url: event.target.value }))}
          />
        </label>

        <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
          Years of experience *
          <input
            type="number"
            min="0"
            step="0.5"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={form.experience_years}
            onChange={(event) => setForm((prev) => ({ ...prev, experience_years: event.target.value }))}
          />
        </label>

        {errors.length > 0 && (
          <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.join(" ")}
          </div>
        )}

        {feedback && (
          <div
            className={`md:col-span-2 rounded-md px-3 py-2 text-sm ${
              feedback.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
