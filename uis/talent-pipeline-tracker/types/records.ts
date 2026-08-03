export type CandidateStatus = "received" | "in_progress" | "selected" | "discarded";

export type CandidateStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

export interface CandidateRecord {
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

export interface Note {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

export interface PaginatedRecordsResponse {
  total: number;
  page: number;
  limit: number;
  data: CandidateRecord[];
}

export interface NotesResponse {
  data: Note[];
  meta: {
    total: number;
  };
}

export interface CandidateInput {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  experience_years: number;
}

export interface CandidatePatch {
  status?: CandidateStatus | null;
  stage?: CandidateStage | null;
}

export interface NoteInput {
  content: string;
}
