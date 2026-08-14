// ============================================================
// Nexova — Modelos de Datos (HR Consulting & Talent Acquisition)
// ============================================================

// -----------------------------------------------------------
// Tipos auxiliares
// -----------------------------------------------------------

export type EnglishLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";

export type SeniorityLevel =
  | "Junior"
  | "Semi-Senior"
  | "Senior"
  | "Lead"
  | "Executive";

export type AvailabilityStatus =
  | "Immediate"
  | "2 weeks"
  | "1 month"
  | "Not available";

export type CandidateStatus = "Active" | "In process" | "Hired" | "Inactive";

export type VacancyStatus = "Open" | "In progress" | "Closed" | "On hold";

export type ProcessStage =
  | "Screening"
  | "Interview"
  | "Technical test"
  | "Final interview"
  | "Offer"
  | "Rejected"
  | "Hired";

// -----------------------------------------------------------
// Interfaces principales
// -----------------------------------------------------------

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  yearsOfExperience: number;
  skills: string[];
  englishLevel: EnglishLevel;
  seniority: SeniorityLevel;
  currentSalary: number;
  expectedSalary: number;
  availability: AvailabilityStatus;
  location: string;
  remoteOnly: boolean;
  status: CandidateStatus;
}

export interface Vacancy {
  id: string;
  title: string;
  companyName: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number;
  maxYearsExperience: number;
  requiredEnglishLevel: EnglishLevel;
  requiredSeniority: SeniorityLevel;
  salaryRangeMin: number;
  salaryRangeMax: number;
  isRemote: boolean;
  location: string;
  status: VacancyStatus;
}

export interface SelectionProcess {
  id: string;
  candidateId: string;
  vacancyId: string;
  stage: ProcessStage;
  score: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------
// Instancias literales de ejemplo (para pruebas)
// -----------------------------------------------------------

export const sampleCandidates: Candidate[] = [
  {
    id: "C-2024-0451",
    fullName: "María González",
    email: "maria.gonzalez@email.com",
    phone: "+56912345678",
    yearsOfExperience: 5,
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    englishLevel: "B2",
    seniority: "Semi-Senior",
    currentSalary: 3500,
    expectedSalary: 4200,
    availability: "1 month",
    location: "Valencia, España",
    remoteOnly: false,
    status: "Active",
  },
  {
    id: "C-2024-0452",
    fullName: "Juan Pérez",
    email: "juan.perez@email.com",
    phone: "+56987654321",
    yearsOfExperience: 3,
    skills: ["JavaScript", "React", "CSS", "HTML"],
    englishLevel: "B1",
    seniority: "Junior",
    currentSalary: 2200,
    expectedSalary: 2800,
    availability: "Immediate",
    location: "Miami, Florida, Estados Unidos",
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
    location: "Valencia, España",
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