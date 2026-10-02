// Types for the Talent Tracker API records (candidates).

export type CandidateStatus =
  | "received"
  | "in_progress"
  | "selected"
  | "discarded";

export type CandidateStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

export interface CandidateNote {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

/** Response for GET /records/{id}/notes */
export interface NotesResponse {
  data: CandidateNote[];
  meta: { total: number };
}

/** Request body for POST /records/{id}/notes */
export interface NoteCreate {
  content: string;
}

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
  notes?: CandidateNote[];
}

export interface CandidatesResponse {
  total: number;
  page: number;
  limit: number;
  data: Candidate[];
}

/** Request body for PATCH /records/{id} */
export interface CandidatePatch {
  status?: CandidateStatus | null;
  stage?: CandidateStage | null;
}

/** Request body for POST /records (create a new candidate) */
export interface RecordCreate {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url?: string | null;
  cv_url?: string | null;
  experience_years: number;
}