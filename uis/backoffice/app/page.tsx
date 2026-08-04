"use client";

import { useState } from "react";
import type { Candidate, Vacancy } from "../../../../src/types";
import { calculateCandidateScore } from "../../../../src/utils/transformations";

// Datos de prueba simulados importados según los modelos de Hito 2
const sampleVacancy: Vacancy = {
  id: "V-2026-001",
  title: "Senior AI & Full-Stack Developer",
  companyName: "Nexova Tech Talent",
  requiredSkills: ["TypeScript", "React", "Next.js"],
  preferredSkills: ["Tailwind CSS", "Node.js", "Python"],
  minYearsExperience: 4,
  maxYearsExperience: 8,
  requiredEnglishLevel: "B2",
  requiredSeniority: "Senior",
  salaryRangeMin: 45000,
  salaryRangeMax: 65000,
  isRemote: true,
  location: "Valencia, España",
  status: "Open",
};

const sampleCandidates: Candidate[] = [
  {
    id: "C-2026-010",
    fullName: "Carlos Mendoza",
    email: "carlos.mendoza@example.com",
    phone: "+34 611 223 344",
    yearsOfExperience: 6,
    skills: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Node.js"],
    englishLevel: "C1",
    seniority: "Senior",
    currentSalary: 50000,
    expectedSalary: 58000,
    availability: "Immediate",
    location: "Valencia, España",
    remoteOnly: true,
    status: "Active",
  },
  {
    id: "C-2026-011",
    fullName: "Ana Gómez",
    email: "ana.gomez@example.com",
    phone: "+34 622 334 455",
    yearsOfExperience: 4,
    skills: ["TypeScript", "React", "CSS"],
    englishLevel: "B2",
    seniority: "Semi-Senior",
    currentSalary: 38000,
    expectedSalary: 44000,
    availability: "2 weeks",
    location: "Madrid, España",
    remoteOnly: true,
    status: "In process",
  },
  {
    id: "C-2026-012",
    fullName: "David Vila",
    email: "david.vila@example.com",
    phone: "+1 305 998 776",
    yearsOfExperience: 2,
    skills: ["JavaScript", "HTML"],
    englishLevel: "A2",
    seniority: "Junior",
    currentSalary: 25000,
    expectedSalary: 32000,
    availability: "1 month",
    location: "Miami, EE.UU.",
    remoteOnly: false,
    status: "Active",
  },
];

export default function CandidateScoringDashboard() {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate>(sampleCandidates[0]);

  // Ejecución directa de la función de scoring de Hito 2 (importada desde src/utils/transformations)
  const candidatesWithScores = sampleCandidates.map((c) => ({
    candidate: c,
    score: calculateCandidateScore(c, sampleVacancy),
  })).sort((a, b) => b.score - a.score);

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (score >= 50) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  };

  return (
    <div className="space-y-8">
      {/* Vacancy Card Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-2">
              Vacante Activa Target: {sampleVacancy.id}
            </span>
            <h2 className="text-2xl font-bold text-white">{sampleVacancy.title}</h2>
            <p className="text-sm text-slate-400">{sampleVacancy.companyName} • {sampleVacancy.location}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider block">Rango Salarial</span>
            <span className="text-lg font-bold text-slate-200">
              ${sampleVacancy.salaryRangeMin.toLocaleString()} - ${sampleVacancy.salaryRangeMax.toLocaleString()} USD
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-900 flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 mr-2 py-1">Skills Requeridas:</span>
          {sampleVacancy.requiredSkills.map((skill) => (
            <span key={skill} className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Candidate Ranking & Live Match Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span>Ranking de Candidatos Procesados (Algoritmo Hito 2)</span>
          <span className="text-xs font-normal text-slate-400">Importado de src/utils/transformations.ts</span>
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          {candidatesWithScores.map(({ candidate, score }) => (
            <div
              key={candidate.id}
              onClick={() => setSelectedCandidate(candidate)}
              className={`cursor-pointer rounded-xl border p-5 transition ${
                selectedCandidate.id === candidate.id
                  ? "border-blue-500 bg-slate-900/80 shadow-lg shadow-blue-500/5"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-white">{candidate.fullName}</h4>
                  <p className="text-xs text-slate-400">{candidate.seniority} • {candidate.yearsOfExperience} años exp</p>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getScoreBadgeColor(score)}`}>
                  {score} pts
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-400 mb-3">
                <p>Nivel Inglés: <strong className="text-slate-200">{candidate.englishLevel}</strong></p>
                <p>Expectativa: <strong className="text-slate-200">${candidate.expectedSalary.toLocaleString()} USD</strong></p>
              </div>

              <div className="flex flex-wrap gap-1">
                {candidate.skills.slice(0, 3).map((s) => (
                  <span key={s} className="rounded bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
