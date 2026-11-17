"use client";

import { useState } from "react";
import type { Candidate, CreateCandidatePayload } from "@/types";

interface Option {
  value: string;
  label: string;
}

interface CandidateFormProps {
  initial?: Candidate;
  onSubmit: (payload: CreateCandidatePayload) => Promise<void>;
  onCancel?: () => void;
  statusOptions?: Option[];
  stageOptions?: Option[];
}

export function CandidateForm({
  initial,
  onSubmit,
  onCancel,
  statusOptions,
  stageOptions,
}: CandidateFormProps) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedin_url ?? "");
  const [cvUrl, setCvUrl] = useState(initial?.cv_url ?? "");
  const [experienceYears, setExperienceYears] = useState(
    initial?.experience_years?.toString() ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        full_name: fullName,
        email,
        phone,
        position,
        linkedin_url: linkedinUrl || null,
        cv_url: cvUrl || null,
        experience_years: Number(experienceYears),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = !!initial;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Full Name */}
      <div>
        <label style={labelStyle}>
          Full Name <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>
          Email <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {/* Phone */}
      <div>
        <label style={labelStyle}>
          Phone <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input className="input" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      {/* Position */}
      <div>
        <label style={labelStyle}>
          Position <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input className="input" required value={position} onChange={(e) => setPosition(e.target.value)} />
      </div>

      {/* LinkedIn URL */}
      <div>
        <label style={labelStyle}>LinkedIn URL</label>
        <input className="input" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
      </div>

      {/* CV URL */}
      <div>
        <label style={labelStyle}>CV URL</label>
        <input className="input" type="url" value={cvUrl} onChange={(e) => setCvUrl(e.target.value)} />
      </div>

      {/* Experience Years */}
      <div>
        <label style={labelStyle}>
          Years of Experience <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input className="input" type="number" min="0" step="0.5" required value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Update Candidate" : "Add Candidate"}
        </button>
        {onCancel && (
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: "0.25rem",
};