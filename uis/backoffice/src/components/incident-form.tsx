"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { BRANCHES, CATEGORIES, ORIGINS, STATUSES, readFailure } from "@/lib/incidents";
import { cn } from "@/lib/utils";

type FormValues = {
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
};

const EMPTY: FormValues = {
  title: "",
  description: "",
  category: "",
  status: "",
  origin: "",
  branch: "",
};

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60";

function validate(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = "Enter a title.";
  if (!values.description.trim()) errors.description = "Enter a description.";
  if (!CATEGORIES.some((item) => item.value === values.category)) errors.category = "Choose a category.";
  if (!STATUSES.some((item) => item.value === values.status)) errors.status = "Choose a status.";
  if (!ORIGINS.some((item) => item.value === values.origin)) errors.origin = "Choose an origin.";
  if (!BRANCHES.some((item) => item.value === values.branch)) errors.branch = "Choose a clinic.";
  return errors;
}

export function IncidentForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState("");

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmation("");
    setFormError("");
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description.trim(),
          category: values.category,
          status: values.status,
          origin: values.origin,
          branch: values.branch,
        }),
      });
      if (!response.ok) {
        const failure = await readFailure(response, "The incident could not be saved. Check the form and try again.");
        const fieldErrors: Record<string, string> = {};
        for (const item of failure.errors) fieldErrors[item.field] = item.message;
        setErrors(fieldErrors);
        setFormError(failure.errors.length > 0 ? "The incident was not saved. Check the highlighted fields." : failure.message);
        return;
      }
      setValues(EMPTY);
      setErrors({});
      setConfirmation("Incident registered.");
    } catch {
      setFormError("The incident could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form data-testid="incident-form" className="space-y-5" onSubmit={onSubmit} noValidate>
      {confirmation ? (
        <Alert data-testid="confirmation">
          <AlertTitle>{confirmation}</AlertTitle>
        </Alert>
      ) : null}
      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>{formError}</AlertTitle>
        </Alert>
      ) : null}

      <Field label="Title" error={errors.title}>
        <input
          className={inputClass}
          value={values.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(event) => update("title", event.target.value)}
        />
      </Field>

      <div
        className="rounded-lg border-2 border-red-700 bg-red-50 px-4 py-3 text-base font-semibold text-red-950"
        role="note"
      >
        Do not enter identifying patient data. Do not type a name, date of birth, medical record number, or contact
        details. If a patient is involved, refer to them only by an opaque internal identifier.
      </div>

      <Field label="Description" error={errors.description}>
        <textarea
          className={cn(inputClass, "min-h-28 py-2")}
          value={values.description}
          aria-invalid={Boolean(errors.description)}
          onChange={(event) => update("description", event.target.value)}
        />
      </Field>

      <Field label="Category" error={errors.category}>
        <select
          className={inputClass}
          value={values.category}
          aria-invalid={Boolean(errors.category)}
          onChange={(event) => update("category", event.target.value)}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Status" error={errors.status}>
        <select
          className={inputClass}
          value={values.status}
          aria-invalid={Boolean(errors.status)}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="">Select a status</option>
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Origin" error={errors.origin}>
        <select
          className={inputClass}
          value={values.origin}
          aria-invalid={Boolean(errors.origin)}
          onChange={(event) => update("origin", event.target.value)}
        >
          <option value="">Select an origin</option>
          {ORIGINS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <div
        className={cn(
          "space-y-2 rounded-lg border p-3",
          values.origin === "branch" ? "border-amber-700 bg-amber-100 ring-2 ring-amber-600" : "border-transparent",
        )}
      >
        <Field label="Branch" error={errors.branch}>
          <select
            className={inputClass}
            value={values.branch}
            aria-invalid={Boolean(errors.branch)}
            onChange={(event) => update("branch", event.target.value)}
          >
            <option value="">Select a clinic</option>
            {BRANCHES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        {values.origin === "branch" ? (
          <p className="text-sm font-semibold text-amber-950">
            You are reporting from a specific clinic. Confirm the branch.
          </p>
        ) : null}
      </div>

      <Field label="Id">
        <input className={inputClass} value="Assigned when the incident is saved" disabled readOnly />
      </Field>
      <Field label="Created at">
        <input className={inputClass} value="Assigned when the incident is saved" disabled readOnly />
      </Field>
      <Field label="Updated at">
        <input className={inputClass} value="Assigned when the incident is saved" disabled readOnly />
      </Field>

      {saving ? (
        <p role="status" className="text-sm font-medium" data-testid="saving">
          Saving the incident…
        </p>
      ) : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Register incident"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm font-medium text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
