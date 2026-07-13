import type { AvailabilityStatus, Candidate, SeniorityLevel } from "../types";

export function filterCandidatesBySkills(
  candidates: Candidate[],
  requiredSkills: string[],
): Candidate[] {
  const normalizedRequired = requiredSkills.map((skill) => skill.trim().toLowerCase());

  return candidates.filter((candidate) => {
    const candidateSkills = new Set(candidate.skills.map((skill) => skill.trim().toLowerCase()));
    return normalizedRequired.every((required) => candidateSkills.has(required));
  });
}

export function filterCandidatesBySeniority(
  candidates: Candidate[],
  seniority: SeniorityLevel,
): Candidate[] {
  return candidates.filter((candidate) => candidate.seniority === seniority);
}

export function filterCandidatesByAvailability(
  candidates: Candidate[],
  availability: AvailabilityStatus[],
): Candidate[] {
  const allowed = new Set(availability);
  return candidates.filter((candidate) => allowed.has(candidate.availability));
}

export function sortCandidatesBySalary(candidates: Candidate[], order: "asc" | "desc"): Candidate[] {
  const multiplier = order === "asc" ? 1 : -1;
  return [...candidates].sort((a, b) => (a.expectedSalary - b.expectedSalary) * multiplier);
}

export function sortCandidatesByExperience(candidates: Candidate[], order: "asc" | "desc"): Candidate[] {
  const multiplier = order === "asc" ? 1 : -1;
  return [...candidates].sort((a, b) => (a.yearsOfExperience - b.yearsOfExperience) * multiplier);
}
