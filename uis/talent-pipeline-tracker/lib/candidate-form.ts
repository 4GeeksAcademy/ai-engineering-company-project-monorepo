import type { Candidate, RecordCreate } from "./types";

export interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  experience_years?: string;
  linkedin_url?: string;
  cv_url?: string;
}

export interface FormState {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
}

export const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  linkedin_url: "",
  cv_url: "",
  experience_years: "0",
};

export function formStateFromCandidate(candidate: Candidate): FormState {
  return {
    full_name: candidate.full_name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    linkedin_url: candidate.linkedin_url ?? "",
    cv_url: candidate.cv_url ?? "",
    experience_years: String(candidate.experience_years),
  };
}

export function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.full_name.trim()) {
    errors.full_name = "Full name is required.";
  } else if (form.full_name.trim().length < 2) {
    errors.full_name = "Full name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.phone.trim()) {
    errors.phone = "Phone is required.";
  } else if (form.phone.trim().length < 6) {
    errors.phone = "Phone must be at least 6 characters.";
  }

  if (!form.position.trim()) {
    errors.position = "Position is required.";
  }

  const years = Number(form.experience_years);
  if (form.experience_years.trim() === "" || Number.isNaN(years)) {
    errors.experience_years = "Experience years is required.";
  } else if (years < 0) {
    errors.experience_years = "Experience years cannot be negative.";
  } else if (years > 50) {
    errors.experience_years = "Experience years seems too high (max 50).";
  }

  if (
    form.linkedin_url.trim() &&
    !/^https?:\/\/.+/.test(form.linkedin_url.trim())
  ) {
    errors.linkedin_url = "LinkedIn URL must start with http(s)://";
  }

  return errors;
}

export function toRecordCreate(form: FormState): RecordCreate {
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    position: form.position.trim(),
    linkedin_url: form.linkedin_url.trim() || null,
    cv_url: form.cv_url.trim() || null,
    experience_years: Number(form.experience_years),
  };
}