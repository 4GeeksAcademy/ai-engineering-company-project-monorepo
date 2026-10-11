import type { CandidateStage, CandidateStatus } from "@/types/models";

export interface CandidateFormValues {
  name: string;
  email: string;
  phone: string;
  position: string;
  linkedinUrl: string;
  resumeUrl: string;
  yearsOfExperience: string;
  status: CandidateStatus;
  stage: CandidateStage;
  appliedAt: string;
}

export interface CandidateFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  yearsOfExperience?: string;
  appliedAt?: string;
  status?: string;
  stage?: string;
}

const VALID_STATUSES: CandidateStatus[] = ["received", "in_progress", "selected", "discarded"];
const VALID_STAGES: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCandidateForm(values: CandidateFormValues): {
  valid: boolean;
  errors: CandidateFormErrors;
} {
  const errors: CandidateFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  }

  if (!values.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "El email no tiene un formato valido.";
  }

  if (!values.phone.trim()) {
    errors.phone = "El telefono es obligatorio.";
  }

  if (!values.position.trim()) {
    errors.position = "El puesto es obligatorio.";
  }

  if (values.linkedinUrl.trim() && !isValidUrl(values.linkedinUrl.trim())) {
    errors.linkedinUrl = "El enlace de LinkedIn debe ser una URL valida.";
  }

  if (values.resumeUrl.trim() && !isValidUrl(values.resumeUrl.trim())) {
    errors.resumeUrl = "El enlace del CV debe ser una URL valida.";
  }

  const years = Number(values.yearsOfExperience);
  if (!Number.isFinite(years) || !Number.isInteger(years) || years < 0) {
    errors.yearsOfExperience = "Los anos de experiencia deben ser un entero mayor o igual a 0.";
  }

  if (!values.appliedAt.trim()) {
    errors.appliedAt = "La fecha de aplicacion es obligatoria.";
  }

  if (!VALID_STATUSES.includes(values.status)) {
    errors.status = "Selecciona un estado valido.";
  }

  if (!VALID_STAGES.includes(values.stage)) {
    errors.stage = "Selecciona una etapa valida.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
