export interface CandidatePayload {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: number;
}

export type CandidateStatus =
  | 'received'
  | 'in_progress'
  | 'selected'
  | 'discarded';

export type CandidateStage =
  | 'pending'
  | 'review'
  | 'personal_interview'
  | 'technical_interview'
  | 'offer_presented';

export interface Candidate extends CandidatePayload {
  id: string;
  status: CandidateStatus;
  stage: CandidateStage;
}

export interface NotePayload {
  content: string;
}

export interface Note extends NotePayload {
  id: string;
}
