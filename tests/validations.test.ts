import { describe, expect, it } from "vitest";

import { isValidEmail, validateCandidate, validateVacancy } from "../src/utils/validations";
import { sampleCandidates, sampleVacancy } from "./fixtures";

describe("validations utils", () => {
  it("validates basic email format", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
    expect(isValidEmail("invalid@domain")).toBe(false);
  });

  it("returns valid true for a valid candidate", () => {
    const result = validateCandidate(sampleCandidates[0]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns validation errors for an invalid candidate", () => {
    const invalid = {
      ...sampleCandidates[0],
      yearsOfExperience: -1,
      currentSalary: 0,
      expectedSalary: 0,
      skills: [],
      email: "bad-email",
      phone: "   ",
    };

    const result = validateCandidate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(6);
  });

  it("returns valid true for a valid vacancy", () => {
    const result = validateVacancy(sampleVacancy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns validation errors for an invalid vacancy", () => {
    const invalid = {
      ...sampleVacancy,
      requiredSkills: [],
      minYearsExperience: -1,
      maxYearsExperience: -2,
      salaryRangeMin: 0,
      salaryRangeMax: -10,
    };

    const result = validateVacancy(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});
