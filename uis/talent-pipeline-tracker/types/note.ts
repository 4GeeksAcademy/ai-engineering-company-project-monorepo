export interface CandidateNote {
  id: string | number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface NoteCreatePayload {
  content: string;
}
