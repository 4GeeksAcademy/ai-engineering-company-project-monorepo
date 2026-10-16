export type CandidateStatus = 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED' | string;
export type CandidateStage = 'SCREENING' | 'INTERVIEW' | 'TECHNICAL_TEST' | 'OFFER' | 'HIRED' | string;

export interface CandidateNote {
  id: number;
  candidate_id?: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position: string;
  linkedin?: string;
  resume_url?: string;
  resume?: string; // Soporte para alias de la API
  years_of_experience?: number;
  status: CandidateStatus;
  stage: CandidateStage;
  applied_at?: string;
  created_at?: string;
  updated_at?: string;
  notes?: CandidateNote[];
}

export interface CreateCandidateInput {
  name: string;
  email: string;
  phone?: string;
  position: string;
  linkedin?: string;
  resume_url?: string;
  years_of_experience?: number;
  status?: CandidateStatus;
  stage?: CandidateStage;
}

export interface UpdateCandidateInput {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin?: string;
  resume_url?: string;
  years_of_experience?: number;
  status?: CandidateStatus;
  stage?: CandidateStage;
}

export interface PatchCandidateInput {
  status?: CandidateStatus;
  stage?: CandidateStage;
}

export interface CandidateFilters {
  status?: string;
  stage?: string;
  query?: string;
}
