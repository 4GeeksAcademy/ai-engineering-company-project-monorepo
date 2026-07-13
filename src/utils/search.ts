import type { Candidate } from "../types";

export function findCandidateById(candidates: Candidate[], id: string): Candidate | null {
  for (const candidate of candidates) {
    if (candidate.id === id) {
      return candidate;
    }
  }

  return null;
}

export function findCandidateByEmail(candidates: Candidate[], email: string): Candidate | null {
  const normalizedEmail = email.trim().toLowerCase();

  for (const candidate of candidates) {
    if (candidate.email.trim().toLowerCase() === normalizedEmail) {
      return candidate;
    }
  }

  return null;
}

export function binarySearchCandidateBySalary(sortedCandidates: Candidate[], targetSalary: number): number {
  let left = 0;
  let right = sortedCandidates.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const middleSalary = sortedCandidates[middle].expectedSalary;

    if (middleSalary === targetSalary) {
      return middle;
    }

    if (middleSalary < targetSalary) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}
