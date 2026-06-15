const candidatesMock = [
  {
    id: "C-001",
    nombre: "Alicia Romero",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 92,
    skills_clave: ["Headhunting", "Entrevista por competencias", "ATS", "Ingles C1"],
    razonamiento_corto:
      "Alta compatibilidad con procesos de mandos medios/directivos, experiencia previa con volumen alto de vacantes y excelente calidad de feedback al cliente.",
  },
  {
    id: "C-002",
    nombre: "Bruno Salas",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 78,
    skills_clave: ["Sourcing", "LinkedIn Recruiter", "CRM", "Comunicacion"],
    razonamiento_corto:
      "Buen potencial para cubrir vacantes tecnicas y gestionar pipeline, pero con menor experiencia en posiciones directivas frente a los perfiles top.",
  },
  {
    id: "C-003",
    nombre: "Carla Nuñez",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 64,
    skills_clave: ["Criba curricular", "Entrevistas", "Reporteria", "Trabajo en equipo"],
    razonamiento_corto:
      "Perfil operativo estable para etapas de preseleccion; requiere soporte adicional en presentaciones ejecutivas y trato consultivo con clientes.",
  },
  {
    id: "C-004",
    nombre: "Diego Mendez",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 47,
    skills_clave: ["Administracion", "Excel", "Seguimiento"],
    razonamiento_corto:
      "Experiencia relevante en soporte administrativo pero brecha en sourcing especializado y evaluacion de perfiles senior.",
  },
  {
    id: "C-005",
    nombre: "Elena Pardo",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 85,
    skills_clave: ["Evaluacion por competencias", "Data recruiting", "Stakeholder management", "Ingles B2"],
    razonamiento_corto:
      "Muy buen equilibrio entre analitica y ejecucion de procesos; destaca en comunicacion con hiring managers y cierre de vacantes criticas.",
  },
];

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
        `<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-900">${skill}</span>`
    )
    .join("");

  return `
    <article class="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">${candidate.id}</p>
          <h3 class="mt-1 text-lg font-semibold text-blue-950">${candidate.nombre}</h3>
          <p class="text-sm text-slate-700">${candidate.puesto_aplicado}</p>
        </div>

        <div class="min-w-[150px]">
          <p class="text-right text-xs font-medium text-slate-600">Score IA</p>
          <p class="text-right text-2xl font-bold text-blue-950">${candidate.score_ia}</p>
          <p class="mt-1 inline-flex w-full justify-center rounded-md border px-2 py-1 text-xs font-semibold ${scoreStyles.badge}">
            ${scoreStyles.label}
          </p>
        </div>
      </header>

      <section class="mt-4">
        <div class="h-2 w-full rounded bg-slate-200" role="progressbar" aria-label="Score IA ${candidate.score_ia} sobre 100" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${candidate.score_ia}">
          <div class="h-2 rounded ${scoreStyles.bar}" style="width: ${candidate.score_ia}%;"></div>
        </div>
      </section>

      <section class="mt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-600">Skills clave</h4>
        <div class="mt-2 flex flex-wrap gap-2">${skills}</div>
      </section>

      <section class="mt-4 border-t border-slate-200 pt-3">
        <button
          type="button"
          class="accordion-toggle inline-flex items-center gap-2 rounded-md border border-blue-300 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
          aria-expanded="false"
          data-target="reasoning-${candidate.id}"
        >
          Ver razonamiento IA
        </button>
        <div id="reasoning-${candidate.id}" class="accordion-content mt-3 hidden rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          ${candidate.razonamiento_corto}
        </div>
      </section>
    </article>
  `;
}

function renderCandidates() {
  const container = document.getElementById("candidatesContainer");
  if (!container) return;

  const sortedCandidates = [...candidatesMock].sort((a, b) => b.score_ia - a.score_ia);
  container.innerHTML = sortedCandidates.map(createCandidateCard).join("");
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
    });
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
  setupScoringPanelToggle();
});
