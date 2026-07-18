"use client";

import { useMemo, useState } from "react";
import type { CandidateRecord, CandidateUpsertPayload } from "@/types/candidate";

interface CandidateFormValues {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
}

interface CandidateFormProps {
  mode: "create" | "edit";
  initialRecord?: CandidateRecord;
  onSubmit: (payload: CandidateUpsertPayload) => Promise<CandidateRecord>;
  onSuccess?: (record: CandidateRecord) => void;
}

function toInitialValues(initialRecord?: CandidateRecord): CandidateFormValues {
  return {
    full_name: initialRecord?.full_name ?? "",
    email: initialRecord?.email ?? "",
    phone: initialRecord?.phone ?? "",
    position: initialRecord?.position ?? "",
    linkedin_url: initialRecord?.linkedin_url ?? "",
    cv_url: initialRecord?.cv_url ?? "",
    experience_years:
      initialRecord?.experience_years !== undefined
        ? String(initialRecord.experience_years)
        : initialRecord?.years_of_experience !== undefined
          ? String(initialRecord.years_of_experience)
          : "",
  };
}

function normalizePayload(values: CandidateFormValues): CandidateUpsertPayload {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    position: values.position.trim(),
    linkedin_url: values.linkedin_url.trim() ? values.linkedin_url.trim() : null,
    cv_url: values.cv_url.trim() ? values.cv_url.trim() : null,
    experience_years: Number(values.experience_years),
  };
}

function validate(values: CandidateFormValues): string {
  if (!values.full_name.trim()) return "Full name is required.";
  if (!values.email.trim()) return "Email is required.";
  if (!values.phone.trim()) return "Phone is required.";
  if (!values.position.trim()) return "Position is required.";
  if (!values.experience_years.trim()) return "Years of experience is required.";

  const years = Number(values.experience_years);
  if (Number.isNaN(years) || years < 0) {
    return "Years of experience must be a valid non-negative number.";
  }

  return "";
}

export function CandidateForm({ mode, initialRecord, onSubmit, onSuccess }: CandidateFormProps) {
  const [values, setValues] = useState<CandidateFormValues>(() => toInitialValues(initialRecord));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const title = useMemo(() => {
    return mode === "create" ? "Register candidate" : "Edit candidate";
  }, [mode]);

  const buttonLabel = mode === "create" ? "Create candidate" : "Save changes";

  const handleChange = (field: keyof CandidateFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = normalizePayload(values);
      const updatedRecord = await onSubmit(payload);
      setSuccess(mode === "create" ? "Candidate created successfully." : "Candidate updated successfully.");
      onSuccess?.(updatedRecord);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit candidate form.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="font-medium">Full name *</span>
          <input
            type="text"
            value={values.full_name}
            onChange={(event) => handleChange("full_name", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">Email *</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">Phone *</span>
            <input
              type="text"
              value={values.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">Position *</span>
            <input
              type="text"
              value={values.position}
              onChange={(event) => handleChange("position", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">Years of experience *</span>
            <input
              type="number"
              min={0}
              step="0.5"
              value={values.experience_years}
              onChange={(event) => handleChange("experience_years", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">LinkedIn URL</span>
            <input
              type="url"
              value={values.linkedin_url}
              onChange={(event) => handleChange("linkedin_url", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">CV URL</span>
            <input
              type="url"
              value={values.cv_url}
              onChange={(event) => handleChange("cv_url", event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-500 focus:ring"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : buttonLabel}
          </button>
          {success ? <p className="text-sm text-green-700">{success}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
