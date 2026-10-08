export type CandidateStatus =
  | 'active'
  | 'hired'
  | 'rejected'
  | 'on_hold'
  | 'in_review'
  | string;

export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical_test'
  | 'offer'
  | 'hired'
  | 'rejected'
  | string;

export interface Note {
  id: string;
  note_id?: string;
  candidateId?: string;
  candidate_id?: string;
  content: string;
  createdAt?: string;
  created_at?: string;
}

export interface Candidate {
  id: string;
  name?: string;
  full_name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  phone_number?: string;
  phoneNumber?: string;
  position?: string;
  role?: string;
  job_title?: string;
  status: CandidateStatus;
  stage: CandidateStage;
  linkedin?: string;
  linkedin_url?: string;
  linkedinUrl?: string;
  cv?: string;
  cv_url?: string;
  cvUrl?: string;
  resume_url?: string;
  resumeUrl?: string;
  years_of_experience?: number;
  yearsOfExperience?: number;
  experience?: number;
  applied_at?: string;
  appliedAt?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface CandidateDetail extends Candidate {
  notes?: Note[];
}

export interface CandidateFilters {
  search: string;
  status: string;
  stage: string;
}
