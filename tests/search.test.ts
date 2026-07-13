import { describe, expect, it } from "vitest";

import {
  binarySearchCandidateBySalary,
  findCandidateByEmail,
  findCandidateById,
} from "../src/utils/search";
import { sortCandidatesBySalary } from "../src/utils/collections";
import { sampleCandidates } from "./fixtures";

describe("search utils", () => {
  it("finds candidate by id", () => {
    const result = findCandidateById(sampleCandidates, "C-2024-0451");
    expect(result?.fullName).toBe("Maria Gonzalez");
  });

  it("returns null when id is not found", () => {
    const result = findCandidateById(sampleCandidates, "C-404");
    expect(result).toBeNull();
  });

  it("finds candidate by email case-insensitively", () => {
    const result = findCandidateByEmail(sampleCandidates, "JUAN.PEREZ@EMAIL.COM");
    expect(result?.id).toBe("C-2024-0452");
  });

  it("finds candidate by salary with binary search", () => {
    const sorted = sortCandidatesBySalary(sampleCandidates, "asc");
    const index = binarySearchCandidateBySalary(sorted, 4200);

    expect(index).not.toBe(-1);
    expect(sorted[index].id).toBe("C-2024-0451");
  });

  it("returns -1 when salary is not present", () => {
    const sorted = sortCandidatesBySalary(sampleCandidates, "asc");
    const index = binarySearchCandidateBySalary(sorted, 9999);

    expect(index).toBe(-1);
  });
});
