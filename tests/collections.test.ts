import { describe, expect, it } from "vitest";

import {
  filterCandidatesByAvailability,
  filterCandidatesBySeniority,
  filterCandidatesBySkills,
  sortCandidatesByExperience,
  sortCandidatesBySalary,
} from "../src/utils/collections";
import { sampleCandidates } from "./fixtures";

describe("collections utils", () => {
  it("filters by required skills case-insensitively", () => {
    const result = filterCandidatesBySkills(sampleCandidates, ["typescript", "REACT"]);
    expect(result.map((candidate) => candidate.id)).toEqual(["C-2024-0451"]);
  });

  it("filters by seniority", () => {
    const result = filterCandidatesBySeniority(sampleCandidates, "Senior");
    expect(result.map((candidate) => candidate.id)).toEqual(["C-2024-0453"]);
  });

  it("filters by availability options", () => {
    const result = filterCandidatesByAvailability(sampleCandidates, ["Immediate", "2 weeks"]);
    expect(result.map((candidate) => candidate.id)).toEqual(["C-2024-0452", "C-2024-0453"]);
  });

  it("sorts by expected salary without mutating input", () => {
    const originalOrder = sampleCandidates.map((candidate) => candidate.id);
    const result = sortCandidatesBySalary(sampleCandidates, "asc");

    expect(result.map((candidate) => candidate.id)).toEqual(["C-2024-0452", "C-2024-0451", "C-2024-0453"]);
    expect(sampleCandidates.map((candidate) => candidate.id)).toEqual(originalOrder);
  });

  it("sorts by experience descending without mutating input", () => {
    const originalOrder = sampleCandidates.map((candidate) => candidate.id);
    const result = sortCandidatesByExperience(sampleCandidates, "desc");

    expect(result.map((candidate) => candidate.id)).toEqual(["C-2024-0453", "C-2024-0451", "C-2024-0452"]);
    expect(sampleCandidates.map((candidate) => candidate.id)).toEqual(originalOrder);
  });
});
