import {
	Candidate,
	CandidateStatus,
	EnglishLevel,
	SelectionProcess,
	SeniorityLevel,
	Vacancy,
} from "../models/models";

const seniorityOrder: SeniorityLevel[] = [
	"Junior",
	"Semi-Senior",
	"Senior",
	"Lead",
	"Executive",
];

const englishLevelOrder: EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"];

const candidateStatuses: CandidateStatus[] = ["Active", "In process", "Hired", "Inactive"];

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

const countMatchingSkills = (candidateSkills: string[], targetSkills: string[]): number => {
	const skillSet = new Set(candidateSkills.map(normalizeValue));

	return targetSkills.reduce((total, skill) => {
		return total + (skillSet.has(normalizeValue(skill)) ? 1 : 0);
	}, 0);
};

const getSkillsScore = (candidate: Candidate, vacancy: Vacancy): number => {
	const requiredSkillCount = vacancy.requiredSkills.length;
	const matchedRequiredSkills = countMatchingSkills(candidate.skills, vacancy.requiredSkills);
	let score = 0;

	if (requiredSkillCount > 0 && matchedRequiredSkills === requiredSkillCount) {
		score += 40;
	} else if (requiredSkillCount > 0 && matchedRequiredSkills / requiredSkillCount >= 0.5) {
		score += 20;
	}

	const preferredSkillMatches = countMatchingSkills(candidate.skills, vacancy.preferredSkills);

	score += Math.min(preferredSkillMatches * 10, 20);

	return score;
};

const getExperienceScore = (candidate: Candidate, vacancy: Vacancy): number => {
	const { yearsOfExperience } = candidate;

	if (
		yearsOfExperience >= vacancy.minYearsExperience &&
		yearsOfExperience <= vacancy.maxYearsExperience
	) {
		return 20;
	}

	const distanceToRange = Math.min(
		Math.abs(yearsOfExperience - vacancy.minYearsExperience),
		Math.abs(yearsOfExperience - vacancy.maxYearsExperience)
	);

	return distanceToRange <= 2 ? 10 : 0;
};

const getOrderedDistance = <T extends string>(orderedValues: T[], left: T, right: T): number => {
	const leftIndex = orderedValues.indexOf(left);
	const rightIndex = orderedValues.indexOf(right);

	return Math.abs(leftIndex - rightIndex);
};

const getSeniorityScore = (candidate: Candidate, vacancy: Vacancy): number => {
	const distance = getOrderedDistance(
		seniorityOrder,
		candidate.seniority,
		vacancy.requiredSeniority
	);

	if (distance === 0) {
		return 15;
	}

	return distance === 1 ? 7 : 0;
};

const getEnglishLevelScore = (candidate: Candidate, vacancy: Vacancy): number => {
	const candidateLevelIndex = englishLevelOrder.indexOf(candidate.englishLevel);
	const requiredLevelIndex = englishLevelOrder.indexOf(vacancy.requiredEnglishLevel);

	return candidateLevelIndex >= requiredLevelIndex ? 15 : 0;
};

const getSalaryScore = (candidate: Candidate, vacancy: Vacancy): number => {
	const { expectedSalary } = candidate;

	if (expectedSalary >= vacancy.salaryRangeMin && expectedSalary <= vacancy.salaryRangeMax) {
		return 10;
	}

	const salaryToleranceLimit = vacancy.salaryRangeMax * 1.2;

	if (expectedSalary > vacancy.salaryRangeMax && expectedSalary <= salaryToleranceLimit) {
		return 5;
	}

	return 0;
};

export function calculateCandidateScore(candidate: Candidate, vacancy: Vacancy): number {
	const score =
		getSkillsScore(candidate, vacancy) +
		getExperienceScore(candidate, vacancy) +
		getSeniorityScore(candidate, vacancy) +
		getEnglishLevelScore(candidate, vacancy) +
		getSalaryScore(candidate, vacancy);

	return Math.max(0, Math.min(score, 100));
}

export function rankCandidatesForVacancy(
	candidates: Candidate[],
	vacancy: Vacancy
): Array<{ candidate: Candidate; score: number }> {
	return candidates
		.map((candidate) => ({
			candidate,
			score: calculateCandidateScore(candidate, vacancy),
		}))
		.sort((left, right) => right.score - left.score);
}

export function groupCandidatesBySeniority(
	candidates: Candidate[]
): Record<SeniorityLevel, Candidate[]> {
	const initialGroups: Record<SeniorityLevel, Candidate[]> = {
		Junior: [],
		"Semi-Senior": [],
		Senior: [],
		Lead: [],
		Executive: [],
	};

	for (const candidate of candidates) {
		initialGroups[candidate.seniority].push(candidate);
	}

	return initialGroups;
}

export function countCandidatesByStatus(
	candidates: Candidate[]
): Record<CandidateStatus, number> {
	const counts = candidateStatuses.reduce<Record<CandidateStatus, number>>((result, status) => {
		result[status] = 0;
		return result;
	}, {} as Record<CandidateStatus, number>);

	for (const candidate of candidates) {
		counts[candidate.status] += 1;
	}

	return counts;
}

export function calculateAverageSalary(candidates: Candidate[]): number {
	if (candidates.length === 0) {
		return 0;
	}

	const totalExpectedSalary = candidates.reduce((total, candidate) => {
		return total + candidate.expectedSalary;
	}, 0);

	return roundToTwoDecimals(totalExpectedSalary / candidates.length);
}

export function findTopSkills(
	candidates: Candidate[],
	topN: number
): Array<{ skill: string; count: number }> {
	if (candidates.length === 0 || topN <= 0) {
		return [];
	}

	const skillCounts = new Map<string, { skill: string; count: number }>();

	for (const candidate of candidates) {
		for (const skill of candidate.skills) {
			const normalizedSkill = normalizeValue(skill);
			const currentEntry = skillCounts.get(normalizedSkill);

			if (currentEntry) {
				currentEntry.count += 1;
			} else {
				skillCounts.set(normalizedSkill, { skill, count: 1 });
			}
		}
	}

	return [...skillCounts.values()]
		.sort((left, right) => {
			if (right.count !== left.count) {
				return right.count - left.count;
			}

			return left.skill.localeCompare(right.skill);
		})
		.slice(0, topN);
}

export function calculateVacancyFillRate(processes: SelectionProcess[]): number {
	if (processes.length === 0) {
		return 0;
	}

	const hiredCount = processes.reduce((total, process) => {
		return total + (process.stage === "Hired" ? 1 : 0);
	}, 0);

	return roundToTwoDecimals((hiredCount / processes.length) * 100);
}
