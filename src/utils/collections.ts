// ============================================================
// Nexova — Operaciones de Colecciones
// Filtrado y ordenamiento de candidatos
// ============================================================

import {
  type Candidate,
  type SeniorityLevel,
  type AvailabilityStatus,
} from "../types/models";

// -----------------------------------------------------------
// Filtrado
// -----------------------------------------------------------

/**
 * Retorna candidatos que tienen TODAS las habilidades requeridas.
 * El matching de habilidades es case-insensitive.
 */
export function filterCandidatesBySkills(
  candidates: Candidate[],
  requiredSkills: string[]
): Candidate[] {
  if (requiredSkills.length === 0) {
    return [];
  }

  const lowerRequired = requiredSkills.map((skill) => skill.toLowerCase());

  return candidates.filter((candidate) => {
    const lowerCandidateSkills = candidate.skills.map((s) => s.toLowerCase());
    return lowerRequired.every((reqSkill) =>
      lowerCandidateSkills.includes(reqSkill)
    );
  });
}

/**
 * Retorna candidatos con el nivel de seniority especificado.
 */
export function filterCandidatesBySeniority(
  candidates: Candidate[],
  seniority: SeniorityLevel
): Candidate[] {
  return candidates.filter((candidate) => candidate.seniority === seniority);
}

/**
 * Retorna candidatos cuya disponibilidad coincida con cualquiera
 * de los estados proporcionados.
 */
export function filterCandidatesByAvailability(
  candidates: Candidate[],
  availability: AvailabilityStatus[]
): Candidate[] {
  if (availability.length === 0) {
    return [];
  }

  return candidates.filter((candidate) =>
    availability.includes(candidate.availability)
  );
}

// -----------------------------------------------------------
// Ordenamiento
// -----------------------------------------------------------

/**
 * Retorna candidatos ordenados por salario esperado (ascendente o descendente).
 * No muta el array original.
 */
export function sortCandidatesBySalary(
  candidates: Candidate[],
  order: "asc" | "desc"
): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (order === "asc") {
      return a.expectedSalary - b.expectedSalary;
    }
    return b.expectedSalary - a.expectedSalary;
  });
}

/**
 * Retorna candidatos ordenados por años de experiencia (ascendente o descendente).
 * No muta el array original.
 */
export function sortCandidatesByExperience(
  candidates: Candidate[],
  order: "asc" | "desc"
): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (order === "asc") {
      return a.yearsOfExperience - b.yearsOfExperience;
    }
    return b.yearsOfExperience - a.yearsOfExperience;
  });
}