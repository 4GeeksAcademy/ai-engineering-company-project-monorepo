const candidatesSeed = [
  {
    id: "C-001",
    nombre: "Alicia Romero",
    email: "alicia.romero.work@example.com",
    telefono: "+34600111222",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 92,
    skills_clave: ["Headhunting", "Entrevista por competencias", "ATS", "Ingles C1"],
    razonamiento_corto:
      "Alta compatibilidad con procesos de mandos medios/directivos, experiencia previa con volumen alto de vacantes y excelente calidad de feedback al cliente.",
  },
  {
    id: "C-002",
    nombre: "Bruno Salas",
    email: "bruno.salas.work@example.com",
    telefono: "+34600333444",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 78,
    skills_clave: ["Sourcing", "LinkedIn Recruiter", "CRM", "Comunicacion"],
    razonamiento_corto:
      "Buen potencial para cubrir vacantes tecnicas y gestionar pipeline, pero con menor experiencia en posiciones directivas frente a los perfiles top.",
  },
  {
    id: "C-003",
    nombre: "Carla Nuñez",
    email: "carla.nunez.work@example.com",
    telefono: "+34600555666",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 64,
    skills_clave: ["Criba curricular", "Entrevistas", "Reporteria", "Trabajo en equipo"],
    razonamiento_corto:
      "Perfil operativo estable para etapas de preseleccion; requiere soporte adicional en presentaciones ejecutivas y trato consultivo con clientes.",
  },
  {
    id: "C-004",
    nombre: "Diego Mendez",
    email: "diego.mendez.work@example.com",
    telefono: "+34600777888",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 47,
    skills_clave: ["Administracion", "Excel", "Seguimiento"],
    razonamiento_corto:
      "Experiencia relevante en soporte administrativo pero brecha en sourcing especializado y evaluacion de perfiles senior.",
  },
  {
    id: "C-005",
    nombre: "Elena Pardo",
    email: "elena.pardo.work@example.com",
    telefono: "+34600999000",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 85,
    skills_clave: ["Evaluacion por competencias", "Data recruiting", "Stakeholder management", "Ingles B2"],
    razonamiento_corto:
      "Muy buen equilibrio entre analitica y ejecucion de procesos; destaca en comunicacion con hiring managers y cierre de vacantes criticas.",
  },
  {
    id: "C-006",
    nombre: "Fernando Gutierrez",
    email: "fernando.g.work@example.com",
    telefono: "+34601112233",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 95,
    skills_clave: ["Headhunting", "Negociación", "Cierre de ofertas", "Ingles C2"],
    razonamiento_corto: "Excelente perfil para roles de liderazgo. Gran experiencia en negociación y cierre de ofertas complejas.",
  },
  {
    id: "C-007",
    nombre: "Gloria Torres",
    email: "gloria.t.work@example.com",
    telefono: "+34602223344",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 75,
    skills_clave: ["Entrevista por competencias", "Sourcing", "Onboarding", "Ingles B2"],
    razonamiento_corto: "Sólida experiencia en entrevistas y sourcing. Podría necesitar apoyo en la gestión de clientes de gran volumen.",
  },
  {
    id: "C-008",
    nombre: "Hector Navarro",
    email: "hector.n.work@example.com",
    telefono: "+34603334455",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 42,
    skills_clave: ["Administración de RRHH", "Nóminas", "Excel"],
    razonamiento_corto: "Perfil más orientado a la administración de personal que a la selección. Poca experiencia en sourcing y headhunting.",
  },
  {
    id: "C-009",
    nombre: "Irene Lozano",
    email: "irene.lozano.work@example.com",
    telefono: "+34604445566",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 88,
    skills_clave: ["Headhunting", "People Analytics", "ATS", "Ingles C1"],
    razonamiento_corto:
      "Perfil con alto encaje para procesos de seleccion consultiva y seguimiento de KPI de reclutamiento en clientes enterprise.",
  },
  {
    id: "C-010",
    nombre: "Javier Cano",
    email: "javier.cano.work@example.com",
    telefono: "+34605556677",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 81,
    skills_clave: ["Sourcing tecnico", "Entrevistas estructuradas", "CRM", "Comunicacion"],
    razonamiento_corto:
      "Buen rendimiento en vacantes tecnologicas y coordinacion con hiring managers; requiere refuerzo puntual en negociacion salarial.",
  },
  {
    id: "C-011",
    nombre: "Karen Vega",
    email: "karen.vega.work@example.com",
    telefono: "+34606667788",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 69,
    skills_clave: ["Criba curricular", "Entrevistas", "Seguimiento", "Reporting"],
    razonamiento_corto:
      "Aporta consistencia operativa en fases iniciales y buena documentacion del pipeline, con margen de mejora en cierres complejos.",
  },
  {
    id: "C-012",
    nombre: "Luis Aranda",
    email: "luis.aranda.work@example.com",
    telefono: "+34607778899",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 53,
    skills_clave: ["ATS", "Coordinacion", "Excel", "Atencion al cliente"],
    razonamiento_corto:
      "Perfil util para soporte de procesos en volumen; necesita acompanamiento para entrevistas por competencias en posiciones senior.",
  },
  {
    id: "C-013",
    nombre: "Marta Prieto",
    email: "marta.prieto.work@example.com",
    telefono: "+34608889900",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 90,
    skills_clave: ["Stakeholder management", "Negociacion", "Headhunting", "Ingles C2"],
    razonamiento_corto:
      "Excelente capacidad de interlocucion con clientes y candidatos clave; destaca en cierre de procesos de alta criticidad.",
  },
  {
    id: "C-014",
    nombre: "Nicolas Rios",
    email: "nicolas.rios.work@example.com",
    telefono: "+34609990011",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 58,
    skills_clave: ["Sourcing", "LinkedIn Recruiter", "ATS", "Onboarding"],
    razonamiento_corto:
      "Buen desempeño en captacion de perfiles intermedios y gestion de onboarding, con menor experiencia en roles ejecutivos.",
  },
  {
    id: "C-015",
    nombre: "Olga Serrano",
    email: "olga.serrano.work@example.com",
    telefono: "+34601112244",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 76,
    skills_clave: ["Entrevistas por competencias", "Employer branding", "Data recruiting", "Ingles B2"],
    razonamiento_corto:
      "Candidata equilibrada para procesos integrales de seleccion; fortalece la experiencia de candidato y la comunicacion con cliente.",
  },
  {
    id: "C-016",
    nombre: "Pablo Rivas",
    email: "pablo.rivas.work@example.com",
    telefono: "+34601223355",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 73,
    skills_clave: ["Sourcing", "ATS", "Entrevistas", "Comunicacion"],
    razonamiento_corto:
      "Perfil versatil para cubrir vacantes de volumen medio, con buena capacidad de seguimiento y coordinacion con hiring managers.",
  },
  {
    id: "C-017",
    nombre: "Quim Beltran",
    email: "quim.beltran.work@example.com",
    telefono: "+34601334466",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 66,
    skills_clave: ["Criba curricular", "LinkedIn Recruiter", "Reporting", "Onboarding"],
    razonamiento_corto:
      "Rinde bien en fases de preseleccion y comunicacion con candidatos, con oportunidad de mejora en cierres de alta complejidad.",
  },
  {
    id: "C-018",
    nombre: "Raquel Dominguez",
    email: "raquel.dominguez.work@example.com",
    telefono: "+34601445577",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 91,
    skills_clave: ["Headhunting", "Negociacion", "Stakeholder management", "Ingles C1"],
    razonamiento_corto:
      "Candidata fuerte para procesos estrategicos y cierres complejos, con alto nivel de interlocucion con cliente.",
  },
  {
    id: "C-019",
    nombre: "Sergio Molina",
    email: "sergio.molina.work@example.com",
    telefono: "+34601556688",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 57,
    skills_clave: ["ATS", "Excel", "Atencion al cliente", "Seguimiento"],
    razonamiento_corto:
      "Buen soporte operativo para procesos continuos; requiere acompanamiento en entrevistas por competencias avanzadas.",
  },
  {
    id: "C-020",
    nombre: "Tamara Solis",
    email: "tamara.solis.work@example.com",
    telefono: "+34601667799",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 83,
    skills_clave: ["People Analytics", "Data recruiting", "ATS", "Ingles B2"],
    razonamiento_corto:
      "Combina enfoque analitico con buena ejecucion de pipeline, ideal para equipos con objetivos de conversion.",
  },
  {
    id: "C-021",
    nombre: "Ulises Marquez",
    email: "ulises.marquez.work@example.com",
    telefono: "+34601778800",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 49,
    skills_clave: ["Administracion", "Excel", "Coordinacion", "CRM"],
    razonamiento_corto:
      "Aporta orden en procesos y cumplimiento de SLAs, con margen de crecimiento en sourcing especializado.",
  },
  {
    id: "C-022",
    nombre: "Valeria Ochoa",
    email: "valeria.ochoa.work@example.com",
    telefono: "+34601889911",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 87,
    skills_clave: ["Entrevista por competencias", "Headhunting", "Employer branding", "Ingles C1"],
    razonamiento_corto:
      "Muy buen encaje en procesos consultivos de punta a punta y excelente experiencia de candidato.",
  },
  {
    id: "C-023",
    nombre: "Walter Naranjo",
    email: "walter.naranjo.work@example.com",
    telefono: "+34601990022",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 62,
    skills_clave: ["Sourcing tecnico", "Entrevistas estructuradas", "ATS", "Comunicacion"],
    razonamiento_corto:
      "Buen rendimiento en vacantes tecnicas, con oportunidad de mejora en negociacion salarial de perfiles senior.",
  },
  {
    id: "C-024",
    nombre: "Ximena Fuentes",
    email: "ximena.fuentes.work@example.com",
    telefono: "+34602001133",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 79,
    skills_clave: ["Stakeholder management", "Sourcing", "Onboarding", "Ingles B2"],
    razonamiento_corto:
      "Perfil equilibrado para gestionar procesos integrales, especialmente util en coordinacion con equipos multidisciplinares.",
  },
  {
    id: "C-025",
    nombre: "Yago Prieto",
    email: "yago.prieto.work@example.com",
    telefono: "+34602112244",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 94,
    skills_clave: ["Headhunting", "Negociacion", "Cierre de ofertas", "Ingles C2"],
    razonamiento_corto:
      "Perfil top para posiciones de alta exigencia, con historial consistente de cierres y calidad de shortlist.",
  },
];

const candidateRoleGroups = [
  [
    "Consultor/a de Seleccion Senior",
    "Talent Acquisition Specialist",
    "Recruiter IT",
    "HR Business Partner",
  ],
  [
    "Analista de Reclutamiento",
    "Sourcer Tecnico",
    "Especialista en Employer Branding",
    "Coordinador/a de Seleccion",
  ],
  [
    "People Analytics Specialist",
    "Consultor/a de RRHH",
    "Talent Partner",
    "Tech Recruiter Senior",
  ],
  [
    "Especialista en Atraccion de Talento",
    "Recruitment Operations Analyst",
    "Consultor/a de Headhunting",
    "Lider de Seleccion",
  ],
];

const candidatesMock = candidatesSeed.map((candidate, index) => {
  const roleGroup = candidateRoleGroups[index % candidateRoleGroups.length];
  return {
    ...candidate,
    puesto_aplicado: roleGroup[0],
    puestos_grupo: roleGroup,
  };
});

const CANDIDATES_STORAGE_KEY = "nexova_candidates_pipeline";

const scoringVacancy = {
  requiredSkills: ["TypeScript", "React", "Node.js"],
  preferredSkills: ["PostgreSQL", "Docker"],
  minYearsExperience: 4,
  maxYearsExperience: 8,
  requiredEnglishLevel: "B2",
  requiredSeniority: "Senior",
  salaryRangeMin: 5000,
  salaryRangeMax: 7000,
};

const englishOrder = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"];
const seniorityOrder = ["Junior", "Semi-Senior", "Senior", "Lead", "Executive"];

const candidateProfileOverrides = {
  "C-001": { yearsOfExperience: 9, englishLevel: "C1", seniority: "Senior", expectedSalary: 6600 },
  "C-002": { yearsOfExperience: 6, englishLevel: "B2", seniority: "Semi-Senior", expectedSalary: 5900 },
  "C-003": { yearsOfExperience: 5, englishLevel: "B2", seniority: "Semi-Senior", expectedSalary: 5200 },
  "C-004": { yearsOfExperience: 3, englishLevel: "B1", seniority: "Junior", expectedSalary: 4300 },
  "C-005": { yearsOfExperience: 7, englishLevel: "B2", seniority: "Senior", expectedSalary: 6100 },
  "C-006": { yearsOfExperience: 11, englishLevel: "C2", seniority: "Lead", expectedSalary: 7600 },
  "C-007": { yearsOfExperience: 6, englishLevel: "B2", seniority: "Semi-Senior", expectedSalary: 5400 },
  "C-008": { yearsOfExperience: 2, englishLevel: "A2", seniority: "Junior", expectedSalary: 3800 },
  "C-009": { yearsOfExperience: 8, englishLevel: "C1", seniority: "Senior", expectedSalary: 6800 },
  "C-010": { yearsOfExperience: 7, englishLevel: "B2", seniority: "Senior", expectedSalary: 6200 },
  "C-011": { yearsOfExperience: 5, englishLevel: "B1", seniority: "Semi-Senior", expectedSalary: 5100 },
  "C-012": { yearsOfExperience: 4, englishLevel: "B1", seniority: "Junior", expectedSalary: 4700 },
  "C-013": { yearsOfExperience: 10, englishLevel: "C2", seniority: "Lead", expectedSalary: 7400 },
  "C-014": { yearsOfExperience: 4, englishLevel: "B1", seniority: "Semi-Senior", expectedSalary: 5000 },
  "C-015": { yearsOfExperience: 6, englishLevel: "B2", seniority: "Semi-Senior", expectedSalary: 5600 },
  "C-016": { yearsOfExperience: 6, englishLevel: "B2", seniority: "Semi-Senior", expectedSalary: 5500 },
  "C-017": { yearsOfExperience: 5, englishLevel: "B1", seniority: "Semi-Senior", expectedSalary: 5300 },
  "C-018": { yearsOfExperience: 9, englishLevel: "C1", seniority: "Senior", expectedSalary: 6900 },
  "C-019": { yearsOfExperience: 4, englishLevel: "B1", seniority: "Junior", expectedSalary: 4800 },
  "C-020": { yearsOfExperience: 7, englishLevel: "B2", seniority: "Senior", expectedSalary: 6300 },
  "C-021": { yearsOfExperience: 3, englishLevel: "B1", seniority: "Junior", expectedSalary: 4400 },
  "C-022": { yearsOfExperience: 8, englishLevel: "C1", seniority: "Senior", expectedSalary: 6700 },
  "C-023": { yearsOfExperience: 5, englishLevel: "B2", seniority: "Semi-Senior", expectedSalary: 5400 },
  "C-024": { yearsOfExperience: 6, englishLevel: "B2", seniority: "Senior", expectedSalary: 6000 },
  "C-025": { yearsOfExperience: 10, englishLevel: "C2", seniority: "Lead", expectedSalary: 7500 },
};

const normalizeText = (value) => value.trim().toLowerCase();

function parseSkillsFilter(skillsFilterRaw) {
  return skillsFilterRaw
    .split(",")
    .map((skill) => normalizeText(skill))
    .filter((skill) => skill.length > 0);
}

function hasAllSkills(candidateSkills, requiredSkills) {
  if (requiredSkills.length === 0) return true;
  const candidateSkillsSet = new Set(candidateSkills.map((skill) => normalizeText(skill)));
  return requiredSkills.every((skill) => candidateSkillsSet.has(skill));
}

function buildCandidateProfile(candidate) {
  const override = candidateProfileOverrides[candidate.id] || {};
  const expectedSalary = override.expectedSalary ?? 5000;
  return {
    yearsOfExperience: override.yearsOfExperience ?? 5,
    skills: override.skills ?? candidate.skills_clave,
    englishLevel: override.englishLevel ?? "B2",
    seniority: override.seniority ?? "Semi-Senior",
    expectedSalary,
  };
}

function getRequiredSkillScore(profile, vacancy) {
  const requiredSkills = [...new Set(vacancy.requiredSkills.map((skill) => normalizeText(skill)))];
  const candidateSkills = new Set(profile.skills.map((skill) => normalizeText(skill)));
  const matchedRequired = requiredSkills.filter((skill) => candidateSkills.has(skill)).length;

  if (requiredSkills.length === 0) return 0;
  if (matchedRequired === requiredSkills.length) return 40;
  return matchedRequired / requiredSkills.length >= 0.5 ? 20 : 0;
}

function getPreferredSkillScore(profile, vacancy) {
  const preferredSkills = [...new Set(vacancy.preferredSkills.map((skill) => normalizeText(skill)))];
  const candidateSkills = new Set(profile.skills.map((skill) => normalizeText(skill)));
  const matchedPreferred = preferredSkills.filter((skill) => candidateSkills.has(skill)).length;
  return Math.min(matchedPreferred * 10, 20);
}

function getExperienceScore(profile, vacancy) {
  if (profile.yearsOfExperience >= vacancy.minYearsExperience && profile.yearsOfExperience <= vacancy.maxYearsExperience) {
    return 20;
  }

  const distance = profile.yearsOfExperience < vacancy.minYearsExperience
    ? vacancy.minYearsExperience - profile.yearsOfExperience
    : profile.yearsOfExperience - vacancy.maxYearsExperience;

  return distance <= 2 ? 10 : 0;
}

function getSeniorityScore(profile, vacancy) {
  if (profile.seniority === vacancy.requiredSeniority) return 15;
  const candidateIndex = seniorityOrder.indexOf(profile.seniority);
  const requiredIndex = seniorityOrder.indexOf(vacancy.requiredSeniority);
  return Math.abs(candidateIndex - requiredIndex) === 1 ? 7 : 0;
}

function getEnglishScore(profile, vacancy) {
  const candidateIndex = englishOrder.indexOf(profile.englishLevel);
  const requiredIndex = englishOrder.indexOf(vacancy.requiredEnglishLevel);
  return candidateIndex >= requiredIndex ? 15 : 0;
}

function getSalaryScore(profile, vacancy) {
  if (profile.expectedSalary >= vacancy.salaryRangeMin && profile.expectedSalary <= vacancy.salaryRangeMax) {
    return 10;
  }

  if (profile.expectedSalary > vacancy.salaryRangeMax && profile.expectedSalary <= vacancy.salaryRangeMax * 1.2) {
    return 5;
  }

  return 0;
}

function calculateCandidateScore(profile, vacancy) {
  const score =
    getRequiredSkillScore(profile, vacancy) +
    getPreferredSkillScore(profile, vacancy) +
    getExperienceScore(profile, vacancy) +
    getSeniorityScore(profile, vacancy) +
    getEnglishScore(profile, vacancy) +
    getSalaryScore(profile, vacancy);

  return Math.max(0, Math.min(100, score));
}

function getScoredCandidates(candidates) {
  return candidates.map((candidate) => {
    const profile = buildCandidateProfile(candidate);
    return {
      ...candidate,
      score_ia: calculateCandidateScore(profile, scoringVacancy),
      candidateProfile: profile,
    };
  });
}

function applyScoringFilters(candidates) {
  const query = normalizeText(document.getElementById("scoringSearch")?.value || "");
  const scoreBand = document.getElementById("scoringScoreBand")?.value || "all";
  const requiredSkills = parseSkillsFilter(document.getElementById("scoringSkillsFilter")?.value || "");

  return candidates.filter((candidate) => {
    const matchesQuery =
      query.length === 0 ||
      normalizeText(candidate.id).includes(query) ||
      normalizeText(candidate.nombre).includes(query) ||
      normalizeText(candidate.puesto_aplicado).includes(query) ||
      (candidate.puestos_grupo || []).some((puesto) => normalizeText(puesto).includes(query));

    const matchesBand =
      scoreBand === "all" ||
      (scoreBand === "high" && candidate.score_ia >= 80) ||
      (scoreBand === "medium" && candidate.score_ia >= 50 && candidate.score_ia < 80) ||
      (scoreBand === "low" && candidate.score_ia < 50);

    const matchesSkills = hasAllSkills(candidate.skills_clave, requiredSkills);

    return matchesQuery && matchesBand && matchesSkills;
  });
}

function toDomainCandidate(candidate) {
  const profile = candidate.candidateProfile || buildCandidateProfile(candidate);
  const statusMap = {
    Nuevo: "Active",
    Contactado: "In process",
    Preseleccionado: "In process",
    Seleccionado: "Hired",
  };

  return {
    id: candidate.id,
    fullName: candidate.nombre,
    email: candidate.email,
    phone: candidate.telefono,
    yearsOfExperience: profile.yearsOfExperience,
    skills: profile.skills,
    englishLevel: profile.englishLevel,
    seniority: profile.seniority,
    currentSalary: Math.round(profile.expectedSalary * 0.85),
    expectedSalary: profile.expectedSalary,
    availability: "Immediate",
    location: "Valencia, Espana",
    remoteOnly: false,
    status: statusMap[candidate.estado_pipeline] || "Active",
  };
}

function findCandidateByIdLinear(candidates, id) {
  for (const candidate of candidates) {
    if (candidate.id === id) {
      return candidate;
    }
  }
  return null;
}

function findCandidateByEmailLinear(candidates, email) {
  const target = normalizeText(email);
  for (const candidate of candidates) {
    if (normalizeText(candidate.email) === target) {
      return candidate;
    }
  }
  return null;
}

function binarySearchCandidateBySalary(sortedCandidates, targetSalary) {
  let left = 0;
  let right = sortedCandidates.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const middleSalary = sortedCandidates[middle].expectedSalary;

    if (middleSalary === targetSalary) {
      return middle;
    }

    if (middleSalary < targetSalary) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

function countCandidatesByStatus(candidates) {
  return candidates.reduce(
    (acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] || 0) + 1;
      return acc;
    },
    { Active: 0, "In process": 0, Hired: 0, Inactive: 0 },
  );
}

function calculateAverageSalary(candidates) {
  if (candidates.length === 0) return 0;
  const total = candidates.reduce((acc, candidate) => acc + candidate.expectedSalary, 0);
  return Math.round((total / candidates.length) * 100) / 100;
}

function findTopSkills(candidates, topN) {
  const skillCount = new Map();

  for (const candidate of candidates) {
    const uniqueSkills = new Set(candidate.skills.map((skill) => normalizeText(skill)));
    for (const skill of uniqueSkills) {
      skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
    }
  }

  return [...skillCount.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, Math.max(0, topN));
}

function calculateVacancyFillRateFromPipeline(candidates) {
  if (candidates.length === 0) return 0;
  const hiredCount = candidates.filter((candidate) => candidate.status === "Hired").length;
  return Math.round(((hiredCount / candidates.length) * 100) * 100) / 100;
}

function renderScoringInsights(filteredCandidates, allCandidates) {
  const domainFiltered = filteredCandidates.map(toDomainCandidate);
  const domainAll = allCandidates.map(toDomainCandidate);

  const visibleCandidatesEl = document.getElementById("insightsVisibleCandidates");
  const averageSalaryEl = document.getElementById("insightsAverageSalary");
  const fillRateEl = document.getElementById("insightsFillRate");
  const topSkillEl = document.getElementById("insightsTopSkill");

  const countsByStatus = countCandidatesByStatus(domainFiltered);
  const averageSalary = calculateAverageSalary(domainFiltered);
  const fillRate = calculateVacancyFillRateFromPipeline(domainFiltered);
  const topSkill = findTopSkills(domainFiltered, 1)[0];

  if (visibleCandidatesEl) {
    visibleCandidatesEl.textContent = `${domainFiltered.length} (${countsByStatus["In process"]} en proceso)`;
  }
  if (averageSalaryEl) {
    averageSalaryEl.textContent = `$${averageSalary.toLocaleString("es-ES")}`;
  }
  if (fillRateEl) {
    fillRateEl.textContent = `${fillRate}%`;
  }
  if (topSkillEl) {
    topSkillEl.textContent = topSkill ? `${topSkill.skill} (${topSkill.count})` : "-";
  }

  const runSearch = () => {
    const idValue = document.getElementById("utilityCandidateId")?.value?.trim() || "";
    const emailValue = document.getElementById("utilityCandidateEmail")?.value?.trim() || "";
    const salaryValueRaw = document.getElementById("utilitySalarySearch")?.value || "";
    const salaryValue = salaryValueRaw.length > 0 ? Number(salaryValueRaw) : NaN;
    const output = document.getElementById("utilitySearchResult");

    if (!output) return;

    const byId = idValue ? findCandidateByIdLinear(domainAll, idValue) : null;
    const byEmail = emailValue ? findCandidateByEmailLinear(domainAll, emailValue) : null;
    const sortedBySalary = [...domainAll].sort((a, b) => a.expectedSalary - b.expectedSalary);
    const binaryIndex = Number.isFinite(salaryValue)
      ? binarySearchCandidateBySalary(sortedBySalary, salaryValue)
      : -1;
    const salaryResult = binaryIndex >= 0 ? sortedBySalary[binaryIndex].fullName : "No encontrado";

    output.textContent =
      `ID: ${byId ? byId.fullName : "No encontrado"} | ` +
      `Email: ${byEmail ? byEmail.fullName : "No encontrado"} | ` +
      `Salario: ${Number.isFinite(salaryValue) ? salaryResult : "Sin valor"}`;
  };

  const runSearchButton = document.getElementById("utilityRunSearch");
  if (runSearchButton && !runSearchButton.dataset.bound) {
    runSearchButton.addEventListener("click", runSearch);
    runSearchButton.dataset.bound = "true";
  }
}

function readCandidates() {
  const data = localStorage.getItem(CANDIDATES_STORAGE_KEY);
  if (!data) {
    const initial = candidatesMock.map(c => ({ ...c, estado_pipeline: "Nuevo" }));
    localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    const initial = candidatesMock.map(c => ({ ...c, estado_pipeline: "Nuevo" }));
    localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  const byId = new Map(Array.isArray(parsed) ? parsed.map((candidate) => [candidate.id, candidate]) : []);
  const hydrated = candidatesMock.map((mockCandidate) => {
    const existing = byId.get(mockCandidate.id);
    return existing
      ? { ...mockCandidate, ...existing, estado_pipeline: existing.estado_pipeline || "Nuevo" }
      : { ...mockCandidate, estado_pipeline: "Nuevo" };
  });

  localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(hydrated));
  return hydrated;
}

function writeCandidates(candidates) {
  localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(candidates));
}

function getNextState(currentState) {
  if (currentState === "Nuevo") return "Contactado";
  if (currentState === "Contactado") return "Preseleccionado";
  if (currentState === "Preseleccionado") return "Seleccionado";
  return null;
}

function getScoreStyles(score) {
  if (score >= 80) {
    return {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      bar: "bg-emerald-500",
      label: "Alto",
    };
  }

  if (score >= 50) {
    return {
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      bar: "bg-amber-500",
      label: "Medio",
    };
  }

  return {
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    bar: "bg-rose-500",
    label: "Bajo",
  };
}

function createCandidateCard(candidate) {
  const scoreStyles = getScoreStyles(candidate.score_ia);
  const skills = candidate.skills_clave
    .map(
      (skill) =>
        `<span class="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">${skill}</span>`
    )
    .join("");

  const nextState = getNextState(candidate.estado_pipeline);
  // Mostrar el estado actual si es Contactado, para diferenciarlo visualmente en la misma pila
  const statusBadge = candidate.estado_pipeline === "Contactado" 
    ? `<span class="mr-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">Contactado</span>` 
    : "";

  const actionButtonHTML = nextState ? `
    <button
      type="button"
      data-advance-candidate="${candidate.id}"
      class="mt-3 w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 whitespace-nowrap"
    >
      Marcar como ${nextState}
    </button>
  ` : `<div class="mt-3 w-full rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 text-center border border-emerald-200 whitespace-nowrap">Seleccionado</div>`;

  const groupLabel = (candidate.puestos_grupo || [candidate.puesto_aplicado]).join(" | ");

  return `
    <article class="rounded-lg border border-amber-300 bg-white p-3 text-amber-900 shadow-sm transition-colors hover:border-amber-400">
      <div class="flex flex-col gap-3 lg:flex-col xl:flex-row xl:items-start xl:justify-between">
        
        <!-- Info Básica (Izquierda) -->
        <div class="w-full xl:w-1/4">
          <p class="text-[10px] font-bold uppercase tracking-wide text-blue-700">${candidate.id} ${statusBadge}</p>
          <h3 class="text-sm font-semibold text-slate-900 leading-tight mt-0.5">${candidate.nombre}</h3>
          <p class="text-[11px] text-slate-600 leading-tight mt-0.5">${candidate.puesto_aplicado}</p>
          <p class="text-[10px] text-slate-500 leading-tight mt-1">Grupo: ${groupLabel}</p>
        </div>

        <!-- Skills y Acciones (Centro) -->
        <div class="w-full flex-1 xl:px-3 border-y xl:border-y-0 xl:border-l xl:border-r border-amber-200 border-dashed xl:border-solid mx-0 my-2 py-2 xl:mx-2 xl:my-0">
          <div class="flex flex-wrap gap-1.5">${skills}</div>
          <div class="mt-3 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              class="accordion-toggle inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-900 hover:bg-amber-100"
              aria-expanded="false"
              data-target="reasoning-${candidate.id}"
            >
              <span>Ver razonamiento IA</span>
              <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg>
            </button>
            <a href="mailto:${candidate.email}" class="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50" title="Email">Email</a>
            <a href="tel:${candidate.telefono}" class="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50" title="Llamar">Llamar</a>
            <a href="https://wa.me/${candidate.telefono}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center rounded border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50" title="WhatsApp">WA</a>
          </div>
        </div>

        <!-- Score IA (Derecha) -->
        <div class="w-full xl:w-[100px] xl:text-right flex items-center justify-between xl:block xl:pl-2">
          <div class="flex items-center gap-3 xl:justify-end">
            <span class="inline-flex min-w-[50px] justify-center rounded border px-2 py-0.5 text-[10px] font-bold ${scoreStyles.badge}">
              ${scoreStyles.label}
            </span>
            <p class="text-xl font-bold text-slate-900 leading-none">${candidate.score_ia}</p>
          </div>
        </div>
      </div>
      
      <!-- Botón de avance Pipeline -->
      ${actionButtonHTML}

      <!-- Acordeón Oculto -->
      <div id="reasoning-${candidate.id}" class="accordion-content mt-3 hidden rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
        ${candidate.razonamiento_corto}
      </div>
    </article>
  `;
}

function bindCandidateActions() {
  document.querySelectorAll("[data-advance-candidate]").forEach(btn => {
    if (btn.dataset.bound) return;
    btn.addEventListener("click", () => {
      const id = btn.dataset.advanceCandidate;
      const candidates = readCandidates();
      const index = candidates.findIndex(c => c.id === id);
      if (index > -1) {
        candidates[index].estado_pipeline = getNextState(candidates[index].estado_pipeline);
        writeCandidates(candidates);
        renderCandidates();
      }
    });
    btn.dataset.bound = "true";
  });
}

function renderCandidates() {
  const containerNuevos = document.getElementById("candidatesContainer");
  const candidatesContactados = document.getElementById("candidates-contactados");
  const candidatesPreseleccionados = document.getElementById("candidates-preseleccionados");
  const candidatesSeleccionados = document.getElementById("candidates-seleccionados");
  const sortSelect = document.getElementById("sortCandidates");

  if (!containerNuevos || !candidatesContactados || !candidatesPreseleccionados || !candidatesSeleccionados) {
    return;
  }

  const allCandidates = getScoredCandidates(readCandidates());
  const filteredCandidates = applyScoringFilters(allCandidates);
  
  containerNuevos.innerHTML = "";
  candidatesContactados.innerHTML = "";
  candidatesPreseleccionados.innerHTML = "";
  candidatesSeleccionados.innerHTML = "";

  const sortOrder = sortSelect ? sortSelect.value : "desc";

  // Distribuir "Nuevos" en la lista principal
  const nuevos = filteredCandidates.filter(c => c.estado_pipeline === "Nuevo");

  // Filtrar el resto del pipeline
  const contactados = filteredCandidates.filter(c => c.estado_pipeline === "Contactado");
  const preseleccionados = filteredCandidates.filter(c => c.estado_pipeline === "Preseleccionado");
  const seleccionados = filteredCandidates.filter(c => c.estado_pipeline === "Seleccionado");

  const scoringResultsInfo = document.getElementById("scoringResultsInfo");
  if (scoringResultsInfo) {
    scoringResultsInfo.textContent = `${filteredCandidates.length} de ${allCandidates.length} candidatos visibles`;
  }

  renderScoringInsights(filteredCandidates, allCandidates);

  nuevos.sort((a, b) => {
    return sortOrder === "desc" ? b.score_ia - a.score_ia : a.score_ia - b.score_ia;
  });

  nuevos.forEach(candidate => {
    containerNuevos.innerHTML += createCandidateCard(candidate);
  });

  // Actualizar contadores
  const countNuevos = document.getElementById("count-nuevos");
  const countContactados = document.getElementById("count-contactados");
  const countPreseleccionados = document.getElementById("count-preseleccionados");
  const countSeleccionados = document.getElementById("count-seleccionados");

  if (countNuevos) countNuevos.textContent = nuevos.length;
  if (countContactados) countContactados.textContent = contactados.length;
  if (countPreseleccionados) countPreseleccionados.textContent = preseleccionados.length;
  if (countSeleccionados) countSeleccionados.textContent = seleccionados.length;

  // Distribuir el resto en el pipeline (las tarjetas se adaptarán al ancho)
  contactados
    .sort((a, b) => {
      return sortOrder === "desc" ? b.score_ia - a.score_ia : a.score_ia - b.score_ia;
    })
    .forEach(c => candidatesContactados.innerHTML += createCandidateCard(c));

  preseleccionados
    .sort((a, b) => {
      return sortOrder === "desc" ? b.score_ia - a.score_ia : a.score_ia - b.score_ia;
    })
    .forEach(c => candidatesPreseleccionados.innerHTML += createCandidateCard(c));

  seleccionados
    .sort((a, b) => {
      return sortOrder === "desc" ? b.score_ia - a.score_ia : a.score_ia - b.score_ia;
    })
    .forEach(c => candidatesSeleccionados.innerHTML += createCandidateCard(c));

  setupAccordions();
  bindCandidateActions();
}

function setupAccordions() {
  const toggles = document.querySelectorAll(".accordion-toggle");

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-target");
      const content = document.getElementById(targetId);
      if (!content) return;

      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isExpanded));
      content.classList.toggle("hidden", isExpanded);
      
      const icon = toggle.querySelector("svg");
      if(icon) {
        icon.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
      }
    });
  });
}

function setupSortCandidatesDropdown() {
  const sortSelect = document.getElementById("sortCandidates");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", () => {
    renderCandidates();
  });
}

function setupScoringFilters() {
  const searchInput = document.getElementById("scoringSearch");
  const scoreBand = document.getElementById("scoringScoreBand");
  const skillsInput = document.getElementById("scoringSkillsFilter");
  const resetButton = document.getElementById("resetScoringFilters");

  if (searchInput) {
    searchInput.addEventListener("input", () => renderCandidates());
  }

  if (scoreBand) {
    scoreBand.addEventListener("change", () => renderCandidates());
  }

  if (skillsInput) {
    skillsInput.addEventListener("input", () => renderCandidates());
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (scoreBand) scoreBand.value = "all";
      if (skillsInput) skillsInput.value = "";
      renderCandidates();
    });
  }
}

function setupPipelineAccordions() {
  // Ya solo queda el acordeon de Nuevos, pero mantenemos la lógica por si acaso
  const toggles = document.querySelectorAll(".pipeline-toggle");
  toggles.forEach(toggle => {
    if(toggle.dataset.bound) return;
    
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-target");
      const content = document.getElementById(targetId);
      if(!content) return;
      
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isExpanded));
      content.classList.toggle("hidden", isExpanded);
      
      const icon = toggle.querySelector("svg");
      if(icon) {
        icon.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
      }
    });
    toggle.dataset.bound = "true";
  });
}

function setupScoringPanelToggle() {
  const toggleButton = document.getElementById("scoringToggleButton");
  const panelContent = document.getElementById("scoringPanelContent");

  if (!toggleButton || !panelContent) return;

  toggleButton.addEventListener("click", () => {
    const isActive = toggleButton.getAttribute("aria-pressed") === "true";
    const nextActive = !isActive;

    toggleButton.setAttribute("aria-pressed", String(nextActive));
    panelContent.classList.toggle("hidden", !nextActive);

    if (nextActive) {
      toggleButton.textContent = "Activado (se muestra el panel scoring)";
      toggleButton.className =
        "inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200";
      return;
    }

    toggleButton.textContent = "Desactivado (se esconde el panel de scoring)";
    toggleButton.className =
      "inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-200";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCandidates();
  setupAccordions();
  setupPipelineAccordions();
  setupSortCandidatesDropdown();
  setupScoringFilters();
  setupScoringPanelToggle();
});
