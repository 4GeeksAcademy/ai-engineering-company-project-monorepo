import type { Candidate, Vacancy } from "../types";

export function isValidEmail(email: string): boolean {
  const normalized = email.trim();
  const atIndex = normalized.indexOf("@");
  const dotIndex = normalized.lastIndexOf(".");
  const hasSingleAt = normalized.split("@").length === 2;

  return hasSingleAt && atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < normalized.length - 1;
}

export function validateCandidate(candidate: Candidate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (candidate.yearsOfExperience < 0 || candidate.yearsOfExperience > 50) {
    errors.push("yearsOfExperience must be between 0 and 50.");
  }

  if (candidate.currentSalary <= 0) {
    errors.push("currentSalary must be greater than 0.");
  }

  if (candidate.expectedSalary <= 0) {
    errors.push("expectedSalary must be greater than 0.");
  }

  const validCandidateSkills = candidate.skills.filter((skill) => skill.trim().length > 0);

  if (validCandidateSkills.length < 1) {
    errors.push("skills must contain at least one skill.");
  }

  if (!isValidEmail(candidate.email)) {
    errors.push("email format is invalid.");
  }

  if (candidate.phone.trim().length === 0) {
    errors.push("phone must not be empty.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateVacancy(vacancy: Vacancy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validRequiredSkills = vacancy.requiredSkills.filter((skill) => skill.trim().length > 0);

  if (validRequiredSkills.length < 1) {
    errors.push("requiredSkills must contain at least one skill.");
  }

  if (vacancy.minYearsExperience < 0) {
    errors.push("minYearsExperience must be greater than or equal to 0.");
  }

  if (vacancy.maxYearsExperience < vacancy.minYearsExperience) {
    errors.push("maxYearsExperience must be greater than or equal to minYearsExperience.");
  }

  if (vacancy.salaryRangeMin <= 0 || vacancy.salaryRangeMax <= 0) {
    errors.push("salaryRangeMin and salaryRangeMax must be greater than 0.");
  }

  if (vacancy.salaryRangeMax < vacancy.salaryRangeMin) {
    errors.push("salaryRangeMax must be greater than or equal to salaryRangeMin.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
