"use client";

import { useState, type FormEvent } from "react";
import { EMPTY_CANDIDATE_FORM, STAGE_LABELS, STATUS_LABELS, STAGES, STATUSES, toCandidatePayload, type Candidate, type CandidateFormValues } from "./types";

interface CandidateFormProps {
  initial?: Candidate;
  onSubmit: (payload: ReturnType<typeof toCandidatePayload>) => Promise<void>;
  onCancel: () => void;
}

export function CandidateForm({ initial, onSubmit, onCancel }: CandidateFormProps) {
  const [values, setValues] = useState<CandidateFormValues>(initial ? {
    name: initial.name,
    email: initial.email,
    phone: initial.phone ?? "",
    position: initial.position,
    linkedin: initial.linkedin ?? "",
    cv_link: initial.cv_link ?? "",
    years_experience: initial.years_experience == null ? "" : String(initial.years_experience),
    status: initial.status,
    stage: initial.stage,
    application_date: initial.application_date?.slice(0, 10) ?? "",
  } : EMPTY_CANDIDATE_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (field: keyof CandidateFormValues, value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit(toCandidatePayload(values));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save candidate.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="candidate-form" onSubmit={submit}>
    <div className="form-heading"><div><p className="eyebrow">{initial ? "UPDATE RECORD" : "NEW REFERRAL"}</p><h2>{initial ? "Edit candidate" : "Register candidate"}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close form">×</button></div>
    {error && <p className="feedback error" role="alert">{error}</p>}
    <div className="form-grid">
      <label>Full name *<input required minLength={2} maxLength={120} value={values.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" /></label>
      <label>Email address *<input required type="email" value={values.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" /></label>
      <label>Phone<input type="tel" value={values.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" /></label>
      <label>Position *<input required value={values.position} onChange={(e) => update("position", e.target.value)} /></label>
      <label>LinkedIn profile<input type="url" value={values.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" /></label>
      <label>CV link<input type="url" value={values.cv_link} onChange={(e) => update("cv_link", e.target.value)} placeholder="https://…" /></label>
      <label>Years of experience<input type="number" min="0" step="1" value={values.years_experience} onChange={(e) => update("years_experience", e.target.value)} /></label>
      <label>Application date *<input required type="date" value={values.application_date} onChange={(e) => update("application_date", e.target.value)} /></label>
      <label>Status<select value={values.status} onChange={(e) => update("status", e.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      <label>Stage<select value={values.stage} onChange={(e) => update("stage", e.target.value)}>{STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select></label>
    </div>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button type="submit" className="button primary" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Register candidate"}</button></div>
  </form>;
}
