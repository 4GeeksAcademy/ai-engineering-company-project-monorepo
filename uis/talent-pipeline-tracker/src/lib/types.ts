export const STATUSES = ["received", "in_progress", "selected", "discarded"] as const;
export const STAGES = ["pending", "review", "personal_interview", "technical_interview", "offer_presented"] as const;

export type CandidateStatus = (typeof STATUSES)[number];
export type CandidateStage = (typeof STAGES)[number];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  selected: "Selected",
  discarded: "Discarded",
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pending review",
  review: "Under review",
  personal_interview: "Personal interview",
  technical_interview: "Technical interview",
  offer_presented: "Offer presented",
};

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  linkedin?: string;
  cv_link?: string;
  years_experience?: number;
  status: CandidateStatus;
  stage: CandidateStage;
  application_date: string;
}

/** Candidate fields as returned by the configured tracker REST API. */
export interface ApiCandidate {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  position: string;
  linkedin_url?: string | null;
  cv_url?: string | null;
  experience_years?: number | null;
  status: CandidateStatus;
  stage: CandidateStage;
  applied_at: string;
}

export type CandidatePayload = Omit<Candidate, "id">;

export interface CandidateNote {
  id: string;
  content: string;
  created_at?: string;
}

export interface CandidateFormValues {
  name: string;
  email: string;
  phone: string;
  position: string;
  linkedin: string;
  cv_link: string;
  years_experience: string;
  status: CandidateStatus;
  stage: CandidateStage;
  application_date: string;
}

export const EMPTY_CANDIDATE_FORM: CandidateFormValues = {
  name: "",
  email: "",
  phone: "",
  position: "Executive Assistant",
  linkedin: "",
  cv_link: "",
  years_experience: "",
  status: "received",
  stage: "pending",
  application_date: new Date().toISOString().slice(0, 10),
};

export function toCandidatePayload(values: CandidateFormValues): CandidatePayload {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    position: values.position.trim(),
    linkedin: values.linkedin.trim(),
    cv_link: values.cv_link.trim(),
    years_experience: values.years_experience === "" ? undefined : Number(values.years_experience),
    status: values.status,
    stage: values.stage,
    application_date: values.application_date,
  };
}
