import { describe, expect, it } from "vitest";

import {
  calculateAverageSalary,
  calculateCandidateScore,
  calculateVacancyFillRate,
  countCandidatesByStatus,
  findTopSkills,
  groupCandidatesBySeniority,
  rankCandidatesForVacancy,
} from "../src/utils/transformations";
import { sampleCandidates, sampleProcesses, sampleVacancy } from "./fixtures";

describe("transformations utils", () => {
  it("calculates candidate score within 0..100", () => {
    const score = calculateCandidateScore(sampleCandidates[2], sampleVacancy);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(100);
  });

  it("ranks candidates by descending score", () => {
    const ranked = rankCandidatesForVacancy(sampleCandidates, sampleVacancy);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });

  it("groups candidates by seniority", () => {
    const grouped = groupCandidatesBySeniority(sampleCandidates);
    expect(grouped.Junior).toHaveLength(1);
    expect(grouped["Semi-Senior"]).toHaveLength(1);
    expect(grouped.Senior).toHaveLength(1);
    expect(grouped.Lead).toHaveLength(0);
    expect(grouped.Executive).toHaveLength(0);
  });

  it("counts candidates by status", () => {
    const counts = countCandidatesByStatus(sampleCandidates);
    expect(counts.Active).toBe(2);
    expect(counts["In process"]).toBe(1);
    expect(counts.Hired).toBe(0);
    expect(counts.Inactive).toBe(0);
  });

  it("calculates average expected salary rounded to 2 decimals", () => {
    const average = calculateAverageSalary(sampleCandidates);
    expect(average).toBe(4500);
  });

  it("finds top skills by number of candidates", () => {
    const top = findTopSkills(sampleCandidates, 3);
    expect(top[0]).toEqual({ skill: "Node.js", count: 2 });
    expect(top[1]).toEqual({ skill: "PostgreSQL", count: 2 });
    expect(top[2]).toEqual({ skill: "React", count: 2 });
  });

  it("calculates fill rate rounded to 2 decimals", () => {
    const fillRate = calculateVacancyFillRate(sampleProcesses);
    expect(fillRate).toBe(33.33);
  });

  it("returns 0 fill rate for empty processes", () => {
    expect(calculateVacancyFillRate([])).toBe(0);
  });
});
