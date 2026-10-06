// ============================================================
// Nexova — Scoring, Matching, Agregaciones y Reportes
// ============================================================

import {
  type Candidate,
  type Vacancy,
  type SelectionProcess,
  type SeniorityLevel,
  type CandidateStatus,
  type EnglishLevel,
} from "../types/models";

// -----------------------------------------------------------
// Scoring y Matching
// -----------------------------------------------------------

const SENIORITY_ORDER: SeniorityLevel[] = [
  "Junior",
  "Semi-Senior",
  "Senior",
  "Lead",
  "Executive",
];

const ENGLISH_ORDER: EnglishLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "Native",
];

/**
 * Calcula un puntaje de match (0-100) entre un candidato y una vacante.
 */
export function calculateCandidateScore(
  candidate: Candidate,
  vacancy: Vacancy
): number {
  let score = 0;

  // --- Match de habilidades (40 puntos máx) ---
  const candidateSkillsLower = candidate.skills.map((s) => s.toLowerCase());
  const requiredSkillsLower = vacancy.requiredSkills.map((s) => s.toLowerCase());
  const preferredSkillsLower = vacancy.preferredSkills.map((s) => s.toLowerCase());

  const hasRequiredSkills = requiredSkillsLower.every((reqSkill) =>
    candidateSkillsLower.includes(reqSkill)
  );

  const requiredCount = requiredSkillsLower.filter((reqSkill) =>
    candidateSkillsLower.includes(reqSkill)
  ).length;

  const requiredPercentage = requiredSkillsLower.length > 0
    ? requiredCount / requiredSkillsLower.length
    : 0;

  if (hasRequiredSkills) {
    score += 40;
  } else if (requiredPercentage >= 0.5) {
    score += 20;
  }

  // +10 por cada habilidad preferida (máx +20)
  const preferredMatchCount = preferredSkillsLower.filter((prefSkill) =>
    candidateSkillsLower.includes(prefSkill)
  ).length;

  score += Math.min(preferredMatchCount * 10, 20);

  // --- Match de experiencia (20 puntos máx) ---
  const exp = candidate.yearsOfExperience;

  if (exp >= vacancy.minYearsExperience && exp <= vacancy.maxYearsExperience) {
    score += 20;
  } else if (
    (exp >= vacancy.minYearsExperience - 2 &&
      exp < vacancy.minYearsExperience) ||
    (exp > vacancy.maxYearsExperience &&
      exp <= vacancy.maxYearsExperience + 2)
  ) {
    score += 10;
  }
  // 0 puntos si está más de 2 años fuera del rango

  // --- Match de seniority (15 puntos máx) ---
  const candidateSeniorityIndex = SENIORITY_ORDER.indexOf(candidate.seniority);
  const requiredSeniorityIndex = SENIORITY_ORDER.indexOf(
    vacancy.requiredSeniority
  );
  const seniorityDiff = Math.abs(
    candidateSeniorityIndex - requiredSeniorityIndex
  );

  if (seniorityDiff === 0) {
    score += 15;
  } else if (seniorityDiff === 1) {
    score += 7;
  }
  // 0 puntos en otro caso

  // --- Match de nivel de inglés (15 puntos máx) ---
  const candidateEnglishIndex = ENGLISH_ORDER.indexOf(candidate.englishLevel);
  const requiredEnglishIndex = ENGLISH_ORDER.indexOf(
    vacancy.requiredEnglishLevel
  );

  if (candidateEnglishIndex >= requiredEnglishIndex) {
    score += 15;
  }
  // 0 puntos en otro caso

  // --- Match de salario (10 puntos máx) ---
  const expected = candidate.expectedSalary;

  if (expected >= vacancy.salaryRangeMin && expected <= vacancy.salaryRangeMax) {
    score += 10;
  } else if (expected > vacancy.salaryRangeMax) {
    const maxSalary = vacancy.salaryRangeMax;
    const twentyPercentAbove = maxSalary * 1.2;

    if (expected <= twentyPercentAbove) {
      score += 5;
    }
    // 0 puntos si está más del 20% por encima
  }
  // Si expected < salaryRangeMin, 0 puntos (el candidato pide menos de lo que ofrecen — no se penaliza ni bonifica)

  return score;
}

/**
 * Puntúa todos los candidatos contra la vacante y los retorna
 * ordenados por puntaje (más alto primero).
 */
export function rankCandidatesForVacancy(
  candidates: Candidate[],
  vacancy: Vacancy
): Array<{ candidate: Candidate; score: number }> {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: calculateCandidateScore(candidate, vacancy),
  }));

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Agrupa candidatos por nivel de seniority.
 * Retorna un objeto donde las claves son niveles de seniority
 * y los valores son arrays de candidatos.
 */
export function groupCandidatesBySeniority(
  candidates: Candidate[]
): Record<SeniorityLevel, Candidate[]> {
  const groups: Record<SeniorityLevel, Candidate[]> = {
    Junior: [],
    "Semi-Senior": [],
    Senior: [],
    Lead: [],
    Executive: [],
  };

  for (const candidate of candidates) {
    if (candidate.seniority in groups) {
      groups[candidate.seniority].push(candidate);
    }
  }

  return groups;
}

// -----------------------------------------------------------
// Agregaciones y Reportes
// -----------------------------------------------------------

/**
 * Retorna un conteo de candidatos para cada estado.
 */
export function countCandidatesByStatus(
  candidates: Candidate[]
): Record<CandidateStatus, number> {
  const counts: Record<CandidateStatus, number> = {
    Active: 0,
    "In process": 0,
    Hired: 0,
    Inactive: 0,
  };

  for (const candidate of candidates) {
    if (candidate.status in counts) {
      counts[candidate.status]++;
    }
  }

  return counts;
}

/**
 * Retorna el salario esperado promedio de todos los candidatos.
 * Redondeado a 2 decimales.
 */
export function calculateAverageSalary(candidates: Candidate[]): number {
  if (candidates.length === 0) {
    return 0;
  }

  const totalSalary = candidates.reduce(
    (sum, candidate) => sum + candidate.expectedSalary,
    0
  );

  return Math.round((totalSalary / candidates.length) * 100) / 100;
}

/**
 * Encuentra las N habilidades más comunes entre todos los candidatos.
 * Retorna ordenadas por frecuencia (más alta primero).
 */
export function findTopSkills(
  candidates: Candidate[],
  topN: number
): Array<{ skill: string; count: number }> {
  const skillCounts = new Map<string, number>();

  for (const candidate of candidates) {
    for (const skill of candidate.skills) {
      const normalized = skill.toLowerCase();
      skillCounts.set(normalized, (skillCounts.get(normalized) ?? 0) + 1);
    }
  }

  const sorted = Array.from(skillCounts.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);

  return sorted.slice(0, topN);
}

/**
 * Calcula qué porcentaje de procesos terminaron en "Hired".
 * Retorna un número entre 0 y 100, redondeado a 2 decimales.
 */
export function calculateVacancyFillRate(
  processes: SelectionProcess[]
): number {
  if (processes.length === 0) {
    return 0;
  }

  const hiredCount = processes.filter(
    (process) => process.stage === "Hired"
  ).length;

  return Math.round((hiredCount / processes.length) * 10000) / 100;
}