import { Candidate, Note } from '../types/candidate';

export function getCandidateName(candidate: Candidate): string {
  return (
    candidate.name ||
    candidate.fullName ||
    candidate.full_name ||
    'Candidato sin nombre'
  );
}

export function getCandidatePosition(candidate: Candidate): string {
  return (
    candidate.position ||
    candidate.role ||
    candidate.job_title ||
    'Puesto no especificado'
  );
}

export function getCandidatePhone(candidate: Candidate): string {
  return (
    candidate.phone ||
    candidate.phone_number ||
    candidate.phoneNumber ||
    'No proporcionado'
  );
}

export function getCandidateLinkedin(candidate: Candidate): string | null {
  return (
    candidate.linkedin ||
    candidate.linkedin_url ||
    candidate.linkedinUrl ||
    null
  );
}

export function getCandidateCv(candidate: Candidate): string | null {
  return (
    candidate.cvUrl ||
    candidate.cv_url ||
    candidate.cv ||
    candidate.resume_url ||
    candidate.resumeUrl ||
    null
  );
}

export function getCandidateExperience(candidate: Candidate): string {
  const exp =
    candidate.yearsOfExperience ??
    candidate.years_of_experience ??
    candidate.experience;

  if (exp === undefined || exp === null) {
    return 'No especificado';
  }
  return `${exp} ${exp === 1 ? 'año' : 'años'}`;
}

export function getCandidateAppliedDate(candidate: Candidate): string {
  const dateStr =
    candidate.appliedAt ||
    candidate.applied_at ||
    candidate.createdAt ||
    candidate.created_at;

  if (!dateStr) return 'No registrada';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getNoteId(note: Note): string {
  return note.id || note.note_id || '';
}

export function getNoteCreatedAt(note: Note): string {
  const dateStr = note.createdAt || note.created_at;
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
