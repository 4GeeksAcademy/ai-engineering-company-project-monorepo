export type CandidateStatus = "received" | "in_progress" | "selected" | "discarded";

export type CandidateStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented";

export interface CandidateRecord {
  id: string | number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  cv_url?: string;
  experience_years?: number;
  years_of_experience?: number;
  status?: CandidateStatus;
  stage?: CandidateStage;
  applied_at?: string;
  updated_at?: string;
  notes_count?: number;
  application_date?: string;
}

export interface CandidateListResponse {
  total?: number;
  page?: number;
  limit?: number;
  records?: CandidateRecord[];
  data?: CandidateRecord[];
}

export interface PaginatedCandidates {
  items: CandidateRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CandidateUpsertPayload {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  experience_years: number;
}
