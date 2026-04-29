import { ErrorDetail, Candidate, Vote, Election } from "../../packages/shared/types";

export function validateRequiredFields<T>(
  obj: T,
  requiredFields: Array<keyof T>
): ErrorDetail[] {
  const errors: ErrorDetail[] = [];

  for (const field of requiredFields) {
    const value = (obj as any)[field];
    if (value === null || value === undefined || value === "") {
      errors.push({
        field: String(field),
        message: `El campo ${String(field)} es obligatorio`,
      });
    }
  }
  return errors;
}

export type ValidationResult = { valid: boolean; errors: ErrorDetail[] };

export function validateConsistency(obj: any): ValidationResult {
  const errors: ErrorDetail[] = [];
  // Validación de fechas si existen
  if (obj.startDate && obj.endDate) {
    if (new Date(obj.startDate) > new Date(obj.endDate)) {
      errors.push({ field: 'startDate', message: 'startDate no puede ser posterior a endDate' });
    }
  }

  // Validaciones numéricas (votos, stock, etc.) no negativos
  const numericFieldsToCheck = ['votes', 'stock', 'price'];
  for (const field of numericFieldsToCheck) {
    if (field in obj && typeof obj[field] === 'number' && obj[field] < 0) {
      errors.push({ field, message: `${field} no puede ser negativo` });
    }
  }

  return { valid: errors.length === 0, errors };
}

// Entity specific validators
export function validateCandidate(candidate: Partial<Candidate>): ValidationResult {
  const errors: ErrorDetail[] = [];
  if (!candidate.id) errors.push({ field: 'id', message: 'id es obligatorio' });
  if (!candidate.name) errors.push({ field: 'name', message: 'name es obligatorio' });
  if (candidate.votes != null && typeof candidate.votes !== 'number') errors.push({ field: 'votes', message: 'votes debe ser number' });
  if (candidate.votes != null && candidate.votes < 0) errors.push({ field: 'votes', message: 'votes no puede ser negativo' });
  return { valid: errors.length === 0, errors };
}

export function validateVote(vote: Partial<Vote>): ValidationResult {
  const errors: ErrorDetail[] = [];
  if (!vote.id) errors.push({ field: 'id', message: 'id es obligatorio' });
  if (!vote.candidateId) errors.push({ field: 'candidateId', message: 'candidateId es obligatorio' });
  if (vote.timestamp && isNaN(Date.parse(vote.timestamp))) errors.push({ field: 'timestamp', message: 'timestamp debe ser ISO válido' });
  return { valid: errors.length === 0, errors };
}

export function validateElection(election: Partial<Election>): ValidationResult {
  const errors: ErrorDetail[] = [];
  if (!election.id) errors.push({ field: 'id', message: 'id es obligatorio' });
  if (!election.name) errors.push({ field: 'name', message: 'name es obligatorio' });
  if (!election.startDate) errors.push({ field: 'startDate', message: 'startDate es obligatorio' });
  if (!election.endDate) errors.push({ field: 'endDate', message: 'endDate es obligatorio' });
  if (election.startDate && election.endDate && new Date(election.startDate) > new Date(election.endDate)) {
    errors.push({ field: 'startDate', message: 'startDate no puede ser posterior a endDate' });
  }
  return { valid: errors.length === 0, errors };
}
