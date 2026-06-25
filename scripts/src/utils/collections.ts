import { AvailabilityStatus, Candidate, SeniorityLevel } from "../models/models";

const normalizeValue = (value: string): string => value.trim().toLowerCase();

export function filterCandidatesBySkills(
	candidates: Candidate[],
	requiredSkills: string[]
): Candidate[] {
	if (requiredSkills.length === 0) {
		return [...candidates];
	}

	const normalizedRequiredSkills = requiredSkills.map(normalizeValue);

	return candidates.filter((candidate) => {
		const candidateSkills = new Set(candidate.skills.map(normalizeValue));

		return normalizedRequiredSkills.every((skill) => candidateSkills.has(skill));
	});
}

export function filterCandidatesBySeniority(
	candidates: Candidate[],
	seniority: SeniorityLevel
): Candidate[] {
	return candidates.filter((candidate) => candidate.seniority === seniority);
}

export function filterCandidatesByAvailability(
	candidates: Candidate[],
	availability: AvailabilityStatus[]
): Candidate[] {
	if (availability.length === 0) {
		return [];
	}

	const allowedStatuses = new Set(availability);

	return candidates.filter((candidate) => allowedStatuses.has(candidate.availability));
}

export function sortCandidatesBySalary(
	candidates: Candidate[],
	order: "asc" | "desc"
): Candidate[] {
	const sortedCandidates = [...candidates];

	sortedCandidates.sort((left, right) => {
		return order === "asc"
			? left.expectedSalary - right.expectedSalary
			: right.expectedSalary - left.expectedSalary;
	});

	return sortedCandidates;
}

export function sortCandidatesByExperience(
	candidates: Candidate[],
	order: "asc" | "desc"
): Candidate[] {
	const sortedCandidates = [...candidates];

	sortedCandidates.sort((left, right) => {
		return order === "asc"
			? left.yearsOfExperience - right.yearsOfExperience
			: right.yearsOfExperience - left.yearsOfExperience;
	});

	return sortedCandidates;
}
