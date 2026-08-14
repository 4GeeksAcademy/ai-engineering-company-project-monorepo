// ============================================================
// Nexova — Validaciones
// Reglas de negocio para candidatos y vacantes
// ============================================================

import { type Candidate, type Vacancy } from "../types/models";

// -----------------------------------------------------------
// Validación de email (básica)
// -----------------------------------------------------------

/**
 * Retorna true si el email contiene @ y . en posiciones correctas.
 * Validación muy básica (no es de nivel producción).
 */
export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    return false;
  }

  const afterAt = email.slice(atIndex + 1);
  const dotIndex = afterAt.indexOf(".");

  // Debe haber un '.' después del '@' y no debe ser el último carácter
  if (dotIndex <= 0 || dotIndex >= afterAt.length - 1) {
    return false;
  }

  return true;
}

// -----------------------------------------------------------
// Validación de Candidato
// -----------------------------------------------------------

/**
 * Valida todas las reglas de negocio para un candidato.
 * Retorna un objeto con:
 * - valid: true si todas las validaciones pasan, false en caso contrario
 * - errors: array de mensajes de error (vacío si es válido)
 */
export function validateCandidate(
  candidate: Candidate
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // yearsOfExperience >= 0 y <= 50
  if (candidate.yearsOfExperience < 0 || candidate.yearsOfExperience > 50) {
    errors.push(
      "yearsOfExperience debe ser un valor entre 0 y 50"
    );
  }

  // currentSalary > 0
  if (candidate.currentSalary <= 0) {
    errors.push("currentSalary debe ser un valor mayor a 0");
  }

  // expectedSalary > 0
  if (candidate.expectedSalary <= 0) {
    errors.push("expectedSalary debe ser un valor mayor a 0");
  }

  // skills debe contener al menos 1 habilidad
  if (!candidate.skills || candidate.skills.length === 0) {
    errors.push("skills debe contener al menos 1 habilidad");
  }

  // email debe tener formato válido
  if (!isValidEmail(candidate.email)) {
    errors.push("email no tiene un formato válido");
  }

  // phone no debe estar vacío
  if (!candidate.phone || candidate.phone.trim().length === 0) {
    errors.push("phone no debe estar vacío");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------
// Validación de Vacante
// -----------------------------------------------------------

/**
 * Valida todas las reglas de negocio para una vacante.
 * Retorna un objeto con:
 * - valid: true si todas las validaciones pasan, false en caso contrario
 * - errors: array de mensajes de error (vacío si es válido)
 */
export function validateVacancy(
  vacancy: Vacancy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // requiredSkills debe contener al menos 1 habilidad
  if (!vacancy.requiredSkills || vacancy.requiredSkills.length === 0) {
    errors.push("requiredSkills debe contener al menos 1 habilidad");
  }

  // minYearsExperience >= 0
  if (vacancy.minYearsExperience < 0) {
    errors.push("minYearsExperience debe ser mayor o igual a 0");
  }

  // maxYearsExperience >= minYearsExperience
  if (vacancy.maxYearsExperience < vacancy.minYearsExperience) {
    errors.push(
      "maxYearsExperience debe ser mayor o igual a minYearsExperience"
    );
  }

  // salaryRangeMax >= salaryRangeMin
  if (vacancy.salaryRangeMax < vacancy.salaryRangeMin) {
    errors.push("salaryRangeMax debe ser mayor o igual a salaryRangeMin");
  }

  // Ambos salarios > 0
  if (vacancy.salaryRangeMin <= 0) {
    errors.push("salaryRangeMin debe ser un valor mayor a 0");
  }

  if (vacancy.salaryRangeMax <= 0) {
    errors.push("salaryRangeMax debe ser un valor mayor a 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}