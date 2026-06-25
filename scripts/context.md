# CONTEXT — Nexova

**Milestone 2: Programming Fundamentals**  
**Company:** Nexova — Human Resources Consulting & Talent Acquisition  
**Your Role:** Junior AI Engineer, TrackFlow Tech Team  
**Project Owner:** Javier Almeida, Operations Manager

---

## About Nexova

Nexova is a human resources consulting and talent acquisition firm based in Valencia, Spain, with expansion operations in Miami, Florida. The company operates three business lines: executive headhunting, customer support outsourcing for tech companies, and corporate training. You're part of the newly formed AI Engineering team tasked with modernising Nexova's operations.

---

## Your Assignment

Javier Almeida, the Operations Manager, needs you to build the core data processing logic for Nexova's candidate management system. The 40 selection consultants currently process everything manually — reading CVs, scoring candidates, matching them to vacancies, and tracking process stages. This milestone focuses on building the TypeScript functions that will power the automated candidate scoring and vacancy matching engine.

 Javier needs to see that you can write solid, well-typed code that handles real business logic correctly.

---

## What You're Building

You will implement a set of TypeScript utilities to:

1. **Model candidate and vacancy data** using interfaces
2. **Filter and search candidates** by skills, experience, and availability
3. **Score candidates** against vacancy requirements
4. **Rank candidates** for a given position
5. **Generate selection reports** with aggregated metrics
6. **Validate data** before processing

---

## Business Entities

### Candidate

A candidate in Nexova's system represents a person in the talent database. Each candidate has:

**Interface: `Candidate`**

```typescript
interface Candidate {
  id: string; // Unique identifier (e.g., "C-2024-0451")
  fullName: string; // Full name
  email: string; // Contact email
  phone: string; // Contact phone
  yearsOfExperience: number; // Total years of professional experience
  skills: string[]; // Array of skills (e.g., ["TypeScript", "React", "Node.js"])
  englishLevel: EnglishLevel; // English proficiency
  seniority: SeniorityLevel; // Professional level
  currentSalary: number; // Current salary in USD
  expectedSalary: number; // Expected salary in USD
  availability: AvailabilityStatus; // Current availability
  location: string; // City and country (e.g., "Valencia, Spain")
  remoteOnly: boolean; // Only accepts remote positions
  status: CandidateStatus; // Current status in the database
}

type EnglishLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
type SeniorityLevel =
  | "Junior"
  | "Semi-Senior"
  | "Senior"
  | "Lead"
  | "Executive";
type AvailabilityStatus = "Immediate" | "2 weeks" | "1 month" | "Not available";
type CandidateStatus = "Active" | "In process" | "Hired" | "Inactive";
```

**Validation Rules:**

- `yearsOfExperience` must be >= 0 and <= 50
- `currentSalary` and `expectedSalary` must be > 0
- `skills` array must contain at least 1 skill
- `email` must be a valid email format (basic check: contains @ and .)
- `phone` must not be empty

---

### Vacancy

A vacancy represents an open position that Nexova is trying to fill for a client.

**Interface: `Vacancy`**

```typescript
interface Vacancy {
  id: string; // Unique identifier (e.g., "V-2024-0892")
  title: string; // Position title (e.g., "Senior Full-Stack Developer")
  companyName: string; // Client company name
  requiredSkills: string[]; // Required technical skills
  preferredSkills: string[]; // Nice-to-have skills
  minYearsExperience: number; // Minimum required experience
  maxYearsExperience: number; // Maximum relevant experience
  requiredEnglishLevel: EnglishLevel; // Minimum English level
  requiredSeniority: SeniorityLevel; // Seniority level required
  salaryRangeMin: number; // Minimum salary offered (USD)
  salaryRangeMax: number; // Maximum salary offered (USD)
  isRemote: boolean; // Remote position
  location: string; // Office location if not remote
  status: VacancyStatus; // Current vacancy status
}

type VacancyStatus = "Open" | "In progress" | "Closed" | "On hold";
```

**Validation Rules:**

- `requiredSkills` must contain at least 1 skill
- `minYearsExperience` must be >= 0
- `maxYearsExperience` must be >= `minYearsExperience`
- `salaryRangeMax` must be >= `salaryRangeMin`
- Both salary values must be > 0

---

### SelectionProcess

Tracks the progress of a candidate through a vacancy selection process.

**Interface: `SelectionProcess`**

```typescript
interface SelectionProcess {
  id: string; // Unique identifier (e.g., "SP-2024-1523")
  candidateId: string; // Reference to candidate
  vacancyId: string; // Reference to vacancy
  stage: ProcessStage; // Current stage
  score: number; // Match score (0-100)
  notes: string; // Consultant notes
  createdAt: Date; // Process start date
  updatedAt: Date; // Last update date
}

type ProcessStage =
  | "Screening"
  | "Interview"
  | "Technical test"
  | "Final interview"
  | "Offer"
  | "Rejected"
  | "Hired";
```

---

## Required Functions

Implement these functions in the appropriate files according to the structure in the README.

### 1. Collection Operations (`src/utils/collections.ts`)

**`filterCandidatesBySkills(candidates: Candidate[], requiredSkills: string[]): Candidate[]`**

- Returns candidates who have ALL the required skills
- Skill matching should be case-insensitive

**`filterCandidatesBySeniority(candidates: Candidate[], seniority: SeniorityLevel): Candidate[]`**

- Returns candidates with the specified seniority level

**`filterCandidatesByAvailability(candidates: Candidate[], availability: AvailabilityStatus[]): Candidate[]`**

- Returns candidates whose availability matches any of the provided statuses

**`sortCandidatesBySalary(candidates: Candidate[], order: "asc" | "desc"): Candidate[]`**

- Returns candidates sorted by expected salary (ascending or descending)
- Should not mutate the original array

**`sortCandidatesByExperience(candidates: Candidate[], order: "asc" | "desc"): Candidate[]`**

- Returns candidates sorted by years of experience
- Should not mutate the original array

---

### 2. Search Operations (`src/utils/search.ts`)

**`findCandidateById(candidates: Candidate[], id: string): Candidate | null`**

- Performs linear search to find a candidate by ID
- Returns the candidate if found, null otherwise

**`findCandidateByEmail(candidates: Candidate[], email: string): Candidate | null`**

- Performs linear search to find a candidate by email
- Email comparison should be case-insensitive
- Returns the candidate if found, null otherwise

**`binarySearchCandidateBySalary(sortedCandidates: Candidate[], targetSalary: number): number`**

- Assumes the array is already sorted by expected salary (ascending)
- Performs binary search to find the index of a candidate with the target salary
- Returns the index if found, -1 otherwise
- Note: If multiple candidates have the same salary, return any valid index

---

### 3. Scoring and Matching (`src/utils/transformations.ts`)

**`calculateCandidateScore(candidate: Candidate, vacancy: Vacancy): number`**

Calculates a match score (0-100) between a candidate and a vacancy based on:

- **Skills match (40 points max):**
  - +40 points if candidate has ALL required skills
  - +20 points if candidate has at least 50% of required skills
  - +10 points for each preferred skill the candidate has (max +20)

- **Experience match (20 points max):**
  - +20 points if candidate's experience is within the vacancy's range
  - +10 points if candidate is 1-2 years outside the range
  - 0 points if more than 2 years outside the range

- **Seniority match (15 points max):**
  - +15 points for exact match
  - +7 points if candidate is one level above or below
  - 0 points otherwise

- **English level match (15 points max):**
  - +15 points if candidate meets or exceeds required level
  - 0 points otherwise

- **Salary match (10 points max):**
  - +10 points if candidate's expected salary is within the vacancy's range
  - +5 points if it's up to 20% above the max
  - 0 points if more than 20% above

**`rankCandidatesForVacancy(candidates: Candidate[], vacancy: Vacancy): Array<{candidate: Candidate, score: number}>`**

- Scores all candidates against the vacancy
- Returns them sorted by score (highest first)
- Each element contains the candidate and their score

**`groupCandidatesBySeniority(candidates: Candidate[]): Record<SeniorityLevel, Candidate[]>`**

- Groups candidates by seniority level
- Returns an object where keys are seniority levels and values are arrays of candidates

---

### 4. Aggregations and Reports (`src/utils/transformations.ts`)

**`countCandidatesByStatus(candidates: Candidate[]): Record<CandidateStatus, number>`**

- Returns a count of candidates for each status

**`calculateAverageSalary(candidates: Candidate[]): number`**

- Returns the average expected salary across all candidates
- Round to 2 decimal places

**`findTopSkills(candidates: Candidate[], topN: number): Array<{skill: string, count: number}>`**

- Finds the N most common skills across all candidates
- Returns them sorted by frequency (highest first)
- Each element contains the skill name and how many candidates have it

**`calculateVacancyFillRate(processes: SelectionProcess[]): number`**

- Calculates what percentage of processes ended in "Hired"
- Returns a number between 0 and 100, rounded to 2 decimal places

---

### 5. Validations (`src/utils/validations.ts`)

**`validateCandidate(candidate: Candidate): { valid: boolean, errors: string[] }`**

- Validates all business rules for a candidate
- Returns an object with:
  - `valid`: true if all validations pass, false otherwise
  - `errors`: array of error messages (empty if valid)

**`validateVacancy(vacancy: Vacancy): { valid: boolean, errors: string[] }`**

- Validates all business rules for a vacancy
- Returns an object with:
  - `valid`: true if all validations pass, false otherwise
  - `errors`: array of error messages (empty if valid)

**`isValidEmail(email: string): boolean`**

- Returns true if email contains @ and . in correct positions
- Very basic validation (not production-grade)

---

## Sample Data

Use this data to test your functions:

### Sample Candidates

```typescript
const sampleCandidates: Candidate[] = [
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
    location: "Valencia, Spain",
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
```

### Sample Vacancy

```typescript
const sampleVacancy: Vacancy = {
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
```

---

## Acceptance Criteria

Your implementation will be evaluated on:

1. **Type Safety:** All interfaces defined correctly with appropriate types
2. **Function Correctness:** Each function produces the expected output for the given inputs
3. **Edge Case Handling:** Functions handle empty arrays, null values, and invalid data gracefully
4. **Validation Logic:** Business rules are enforced accurately
5. **Code Organization:** Functions are in the correct files according to responsibility
6. **Naming Conventions:** Variables, functions, and types follow TypeScript conventions
7. **No Mutations:** Sorting and filtering functions don't modify the original arrays
8. **Pure Functions:** Functions only work with parameters, no global variables

---

## What Javier Expects

> "Look, I don't need this to be perfect. I need it to work and be maintainable. The consultants will be using these functions through a UI we'll build later, but first I need to know the logic is solid. Give me clean code that I can trust, and we'll build the rest on top of it."  
> — Javier Almeida, Operations Manager

---

## Questions?

If you're unsure about any requirement, ask your mentor. In a real work environment, you'd Slack Javier.

---

_This is a real Nexova project. What you build here will become part of the production candidate scoring engine