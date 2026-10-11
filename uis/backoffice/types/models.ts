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

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  yearsOfExperience: number;
  status: CandidateStatus;
  stage: CandidateStage;
  appliedAt: string;
}

export interface CandidateNote {
  id: string;
  candidateId: string;
  content: string;
  createdAt: string;
}
