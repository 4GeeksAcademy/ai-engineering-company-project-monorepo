import { Candidate, SelectionProcess, Vacancy } from "./models/models";
import {
  filterCandidatesByAvailability,
  filterCandidatesBySeniority,
  filterCandidatesBySkills,
  sortCandidatesByExperience,
  sortCandidatesBySalary,
} from "./utils/collections";
import {
  binarySearchCandidateBySalary,
  findCandidateByEmail,
  findCandidateById,
} from "./utils/search";
import {
  calculateAverageSalary,
  calculateCandidateScore,
  calculateVacancyFillRate,
  countCandidatesByStatus,
  findTopSkills,
  groupCandidatesBySeniority,
  rankCandidatesForVacancy,
} from "./utils/transformations";
import { validateCandidate, validateVacancy } from "./utils/validations";

export const sampleCandidates: Candidate[] = [
  {
    id: "C-2024-0451",
    fullName: "Maria Gonzalez",
    email: "maria.gonzalez@email.com",
    phone: "+56912345678",
    yearsOfExperience: 5,
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    englishLevel: "B2",
    seniority: "Semi-Senior",
    currentSalary: 3500,
    expectedSalary: 4200,
    availability: "1 month",
    location: "Valencia, Spain",
    remoteOnly: false,
    status: "Active",
  },
  {
    id: "C-2024-0452",
    fullName: "Juan Perez",
    email: "juan.perez@email.com",
    phone: "+56987654321",
    yearsOfExperience: 3,
    skills: ["JavaScript", "React", "CSS", "HTML"],
    englishLevel: "B1",
    seniority: "Junior",
    currentSalary: 2200,
    expectedSalary: 2800,
    availability: "Immediate",
    location: "Miami, Florida, United States",
    remoteOnly: true,
    status: "Active",
  },
  {
    id: "C-2024-0453",
    fullName: "Carolina Silva",
    email: "carolina.silva@email.com",
    phone: "+56911223344",
    yearsOfExperience: 8,
    skills: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
    englishLevel: "C1",
    seniority: "Senior",
    currentSalary: 5500,
    expectedSalary: 6500,
    availability: "2 weeks",
    location: "Valencia, Spain",
    remoteOnly: false,
    status: "Active",
  },
];

export const sampleVacancy: Vacancy = {
  id: "V-2024-0892",
  title: "Senior Full-Stack Developer",
  companyName: "TechCorp Solutions",
  requiredSkills: ["TypeScript", "React", "Node.js"],
  preferredSkills: ["PostgreSQL", "Docker"],
  minYearsExperience: 4,
  maxYearsExperience: 8,
  requiredEnglishLevel: "B2",
  requiredSeniority: "Senior",
  salaryRangeMin: 5000,
  salaryRangeMax: 7000,
  isRemote: true,
  location: "Remote",
  status: "Open",
};

export const sampleProcesses: SelectionProcess[] = [
  {
    id: "SP-2024-1523",
    candidateId: "C-2024-0451",
    vacancyId: "V-2024-0892",
    stage: "Interview",
    score: 62,
    notes: "Strong frontend profile.",
    createdAt: new Date("2024-05-01T09:00:00.000Z"),
    updatedAt: new Date("2024-05-03T10:30:00.000Z"),
  },
  {
    id: "SP-2024-1524",
    candidateId: "C-2024-0452",
    vacancyId: "V-2024-0892",
    stage: "Rejected",
    score: 20,
    notes: "Does not meet backend requirements.",
    createdAt: new Date("2024-05-02T09:00:00.000Z"),
    updatedAt: new Date("2024-05-04T16:00:00.000Z"),
  },
  {
    id: "SP-2024-1525",
    candidateId: "C-2024-0453",
    vacancyId: "V-2024-0892",
    stage: "Hired",
    score: 85,
    notes: "Best fit for the role.",
    createdAt: new Date("2024-05-01T11:00:00.000Z"),
    updatedAt: new Date("2024-05-10T15:45:00.000Z"),
  },
];

export function runSampleUsage() {
  const salarySortedCandidates = sortCandidatesBySalary(sampleCandidates, "asc");
  const candidateValidations = sampleCandidates.map((candidate) => ({
    id: candidate.id,
    result: validateCandidate(candidate),
  }));
  const bySalaryAscending = salarySortedCandidates.map((candidate) => ({
    fullName: candidate.fullName,
    expectedSalary: candidate.expectedSalary,
  }));
  const byExperienceDescending = sortCandidatesByExperience(sampleCandidates, "desc").map(
    (candidate) => ({
      fullName: candidate.fullName,
      yearsOfExperience: candidate.yearsOfExperience,
    })
  );
  const directScores = sampleCandidates.map((candidate) => ({
    fullName: candidate.fullName,
    score: calculateCandidateScore(candidate, sampleVacancy),
  }));
  const groupedBySeniority = groupCandidatesBySeniority(sampleCandidates);
  const countByStatus = countCandidatesByStatus(sampleCandidates);
  const topSkills = findTopSkills(sampleCandidates, 3);

  return {
    validations: {
      candidates: candidateValidations,
      vacancy: validateVacancy(sampleVacancy),
    },
    filters: {
      requiredSkills: filterCandidatesBySkills(sampleCandidates, sampleVacancy.requiredSkills).map(
        (candidate) => candidate.fullName
      ),
      seniorCandidates: filterCandidatesBySeniority(sampleCandidates, "Senior").map(
        (candidate) => candidate.fullName
      ),
      availableSoon: filterCandidatesByAvailability(sampleCandidates, ["Immediate", "2 weeks"]).map(
        (candidate) => candidate.fullName
      ),
    },
    sorting: {
      bySalaryAscending,
      byExperienceDescending,
    },
    searches: {
      byId: findCandidateById(sampleCandidates, "C-2024-0452")?.fullName ?? null,
      byEmail: findCandidateByEmail(sampleCandidates, "CAROLINA.SILVA@EMAIL.COM")?.fullName ?? null,
      salaryIndex: binarySearchCandidateBySalary(salarySortedCandidates, 4200),
    },
    scoring: {
      directScores,
      rankedCandidates: rankCandidatesForVacancy(sampleCandidates, sampleVacancy).map((entry) => ({
        fullName: entry.candidate.fullName,
        score: entry.score,
      })),
    },
    reports: {
      groupedBySeniority,
      countByStatus,
      averageExpectedSalary: calculateAverageSalary(sampleCandidates),
      topSkills,
      vacancyFillRate: calculateVacancyFillRate(sampleProcesses),
    },
  };
}



export const sampleUsageResults = runSampleUsage();

console.log(JSON.stringify(sampleUsageResults, null, 2));