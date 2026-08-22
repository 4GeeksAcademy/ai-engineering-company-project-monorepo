"use client";

import { useState } from "react";
import { Candidate, CandidateInput } from "@/types/candidate";

type Props = {
  mode: "create" | "edit";
  initialData?: Candidate;
  onClose: () => void;
  onSubmit: (data: CandidateInput) => Promise<void>;
};

const emptyForm: CandidateInput = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: 0,
};

export default function CandidateFormModal({ mode, initialData, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CandidateInput>(
    initialData
      ? {
          full_name: initialData.full_name,
          email: initialData.email,
          phone: initialData.phone,
          position: initialData.position,
          linkedin_url: initialData.linkedin_url ?? "",
          cv_url: initialData.cv_url ?? "",
          experience_years: initialData.experience_years,
        }
      : emptyForm
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function validate(): boolean {
    const problems: string[] = [];
    if (!form.full_name.trim()) problems.push("Full name is required.");
    if (!form.email.trim()) problems.push("Email is required.");
    if (!form.phone.trim()) problems.push("Phone is required.");
    if (!form.position.trim()) problems.push("Position is required.");
    if (form.experience_years === null || form.experience_years === undefined || form.experience_years < 0) {
      problems.push("Years of experience is required.");
    }
    setErrors(problems);
    return problems.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await onSubmit(form);
      setFeedback({ type: "success", text: mode === "create" ? "Candidate registered." : "Candidate updated." });
      setTimeout(onClose, 700);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          {mode === "create" ? "Register Referral" : "Edit Candidate"}
        </h2>

        {errors.length > 0 && (
          <ul className="mb-3 list-inside list-disc rounded bg-red-50 p-2 text-sm text-red-700">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        {feedback && (
          <p
            className={`mb-3 rounded p-2 text-sm ${
              feedback.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {feedback.text}
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <input
            className="col-span-2 rounded border border-slate-300 px-2 py-1"
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            className="rounded border border-slate-300 px-2 py-1"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="rounded border border-slate-300 px-2 py-1"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="col-span-2 rounded border border-slate-300 px-2 py-1"
            placeholder="Position applied for"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <input
            className="rounded border border-slate-300 px-2 py-1"
            placeholder="LinkedIn URL (optional)"
            value={form.linkedin_url ?? ""}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
          />
          <input
            className="rounded border border-slate-300 px-2 py-1"
            placeholder="CV link (optional)"
            value={form.cv_url ?? ""}
            onChange={(e) => setForm({ ...form, cv_url: e.target.value })}
          />
          <input
            type="number"
            min={0}
            className="col-span-2 rounded border border-slate-300 px-2 py-1"
            placeholder="Years of experience"
            value={form.experience_years}
            onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
          />

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
