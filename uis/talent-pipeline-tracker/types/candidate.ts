// Types for the HealthCore Talent Pipeline Tracker
//
// Field names below are confirmed directly against the live OpenAPI schema
// at https://playground.4geeks.com/tracker/api/v1/docs (RecordOut,
// RecordCreate, RecordPatch). Do not rename these fields.
//
// Status/stage VALUES come from CONTEXT-healthcore.md. Raw API values
// must never appear on screen — always render through the *_LABELS maps.

export type CandidateStatus = "received" | "in_progress" | "selected" | "discarded";

export type CandidateStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

export const STATUS_OPTIONS: CandidateStatus[] = [
  "received",
  "in_progress",
  "selected",
  "discarded",
];

export const STAGE_OPTIONS: CandidateStage[] = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
];

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

// Matches NoteCreate exactly: field is "content", not "text".
export interface Note {
  id: string;
  content: string;
  created_at?: string;
}

// Matches RecordOut exactly.
export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: CandidateStatus;
  stage: CandidateStage;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
}

// Matches RecordCreate exactly: NO status/stage field.
export interface CandidateInput {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url?: string | null;
  cv_url?: string | null;
  experience_years: number;
}

// Matches RecordPatch exactly: only status and stage, both optional.
export interface CandidatePatch {
  status?: CandidateStatus | null;
  stage?: CandidateStage | null;
}
