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

export type CandidateNote = {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
};

export type Candidate = {
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
  notes_count?: number;
  applied_at: string;
  updated_at?: string;
};

export type CandidateListResponse = {
  total: number;
  page: number;
  limit: number;
  data: Candidate[];
};

export type CandidateNotesResponse = {
  data: CandidateNote[];
  meta: {
    total: number;
  };
};

export type CandidateFormValues = {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: number;
  status: CandidateStatus;
  stage: CandidateStage;
  applied_at: string;
};
