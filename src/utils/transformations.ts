import type {
  Candidate,
  CandidateStatus,
  EnglishLevel,
  SelectionProcess,
  SeniorityLevel,
  Vacancy,
} from "../types";

const englishOrder: EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"];
const seniorityOrder: SeniorityLevel[] = ["Junior", "Semi-Senior", "Senior", "Lead", "Executive"];

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

const getRequiredSkillScore = (candidate: Candidate, vacancy: Vacancy): number => {
  const candidateSkills = new Set(candidate.skills.map((skill) => skill.trim().toLowerCase()));
  const requiredSkills = [...new Set(vacancy.requiredSkills.map((skill) => skill.trim().toLowerCase()))];

  if (requiredSkills.length === 0) {
    return 0;
  }

  const matchedRequired = requiredSkills.filter((skill) => candidateSkills.has(skill)).length;

  if (matchedRequired === requiredSkills.length) {
    return 40;
  }

  return matchedRequired / requiredSkills.length >= 0.5 ? 20 : 0;
};

const getPreferredSkillScore = (candidate: Candidate, vacancy: Vacancy): number => {
  const candidateSkills = new Set(candidate.skills.map((skill) => skill.trim().toLowerCase()));
  const preferredSkills = [...new Set(vacancy.preferredSkills.map((skill) => skill.trim().toLowerCase()))];

  const matchedPreferred = preferredSkills.filter((skill) => candidateSkills.has(skill)).length;
  return Math.min(matchedPreferred * 10, 20);
};

const getExperienceScore = (candidate: Candidate, vacancy: Vacancy): number => {
  const experience = candidate.yearsOfExperience;

  if (experience >= vacancy.minYearsExperience && experience <= vacancy.maxYearsExperience) {
    return 20;
  }

  const distance = experience < vacancy.minYearsExperience
    ? vacancy.minYearsExperience - experience
    : experience - vacancy.maxYearsExperience;

  return distance <= 2 ? 10 : 0;
};

const getSeniorityScore = (candidate: Candidate, vacancy: Vacancy): number => {
  if (candidate.seniority === vacancy.requiredSeniority) {
    return 15;
  }

  const candidateIndex = seniorityOrder.indexOf(candidate.seniority);
  const requiredIndex = seniorityOrder.indexOf(vacancy.requiredSeniority);

  if (candidateIndex === -1 || requiredIndex === -1) {
    return 0;
  }

  return Math.abs(candidateIndex - requiredIndex) === 1 ? 7 : 0;
};

const getEnglishScore = (candidate: Candidate, vacancy: Vacancy): number => {
  const candidateIndex = englishOrder.indexOf(candidate.englishLevel);
  const requiredIndex = englishOrder.indexOf(vacancy.requiredEnglishLevel);

  if (candidateIndex === -1 || requiredIndex === -1) {
    return 0;
  }

  return candidateIndex >= requiredIndex ? 15 : 0;
};

const getSalaryScore = (candidate: Candidate, vacancy: Vacancy): number => {
  const expected = candidate.expectedSalary;

  if (expected >= vacancy.salaryRangeMin && expected <= vacancy.salaryRangeMax) {
    return 10;
  }

  if (expected > vacancy.salaryRangeMax && expected <= vacancy.salaryRangeMax * 1.2) {
    return 5;
  }

  return 0;
};

export function calculateCandidateScore(candidate: Candidate, vacancy: Vacancy): number {
  const score =
    getRequiredSkillScore(candidate, vacancy) +
    getPreferredSkillScore(candidate, vacancy) +
    getExperienceScore(candidate, vacancy) +
    getSeniorityScore(candidate, vacancy) +
    getEnglishScore(candidate, vacancy) +
    getSalaryScore(candidate, vacancy);

  return Math.max(0, Math.min(100, score));
}

export function rankCandidatesForVacancy(
  candidates: Candidate[],
  vacancy: Vacancy,
): Array<{ candidate: Candidate; score: number }> {
  return candidates
    .map((candidate) => ({ candidate, score: calculateCandidateScore(candidate, vacancy) }))
    .sort((a, b) => b.score - a.score);
}

export function groupCandidatesBySeniority(candidates: Candidate[]): Record<SeniorityLevel, Candidate[]> {
  const grouped: Record<SeniorityLevel, Candidate[]> = {
    Junior: [],
    "Semi-Senior": [],
    Senior: [],
    Lead: [],
    Executive: [],
  };

  for (const candidate of candidates) {
    grouped[candidate.seniority].push(candidate);
  }

  return grouped;
}

export function countCandidatesByStatus(candidates: Candidate[]): Record<CandidateStatus, number> {
  const counts: Record<CandidateStatus, number> = {
    Active: 0,
    "In process": 0,
    Hired: 0,
    Inactive: 0,
  };

  for (const candidate of candidates) {
    counts[candidate.status] += 1;
  }

  return counts;
}

export function calculateAverageSalary(candidates: Candidate[]): number {
  if (candidates.length === 0) {
    return 0;
  }

  const total = candidates.reduce((acc, candidate) => acc + candidate.expectedSalary, 0);
  return roundTo2(total / candidates.length);
}

export function findTopSkills(candidates: Candidate[], topN: number): Array<{ skill: string; count: number }> {
  const skillCount = new Map<string, { label: string; count: number }>();

  for (const candidate of candidates) {
    const uniqueSkills = new Set(candidate.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0));

    for (const skill of uniqueSkills) {
      const key = skill.toLowerCase();
      const previous = skillCount.get(key);
      skillCount.set(key, {
        label: previous?.label ?? skill,
        count: (previous?.count ?? 0) + 1,
      });
    }
  }

  return [...skillCount.values()]
    .map((item) => ({ skill: item.label, count: item.count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, Math.max(0, topN));
}

export function calculateVacancyFillRate(processes: SelectionProcess[]): number {
  if (processes.length === 0) {
    return 0;
  }

  const hiredCount = processes.filter((process) => process.stage === "Hired").length;
  return roundTo2((hiredCount / processes.length) * 100);
}
