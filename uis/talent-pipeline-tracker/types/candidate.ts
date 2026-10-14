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

// One candidate, as returned by GET /records and GET /records/:id
export type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null; // 38 of 101 are null
  cv_url: string | null;
  status: CandidateStatus;
  stage: CandidateStage;
  experience_years: number;
  applied_at: string; // ISO date, e.g. "2026-02-28T20:04:32.114Z"
  updated_at: string;
  notes_count: number;
};

// The wrapper around one page of candidates
export type CandidateListResponse = {
  total: number; // all matching candidates, e.g. 101
  page: number; // current page, starts at 1
  limit: number; // page size, default 20
  data: Candidate[];
};