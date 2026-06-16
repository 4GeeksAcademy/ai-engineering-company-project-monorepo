const candidatesMock = [
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
];

const CANDIDATES_STORAGE_KEY = "nexova_candidates_pipeline";

function readCandidates() {
  const data = localStorage.getItem(CANDIDATES_STORAGE_KEY);
  if (!data) {
    const initial = candidatesMock.map(c => ({ ...c, estado_pipeline: "Nuevo" }));
    localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
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

  return `
    <article class="rounded-lg border border-amber-300 bg-white p-3 text-amber-900 shadow-sm transition-colors hover:border-amber-400">
      <div class="flex flex-col gap-3 lg:flex-col xl:flex-row xl:items-start xl:justify-between">
        
        <!-- Info Básica (Izquierda) -->
        <div class="w-full xl:w-1/4">
          <p class="text-[10px] font-bold uppercase tracking-wide text-blue-700">${candidate.id} ${statusBadge}</p>
          <h3 class="text-sm font-semibold text-slate-900 leading-tight mt-0.5">${candidate.nombre}</h3>
          <p class="text-[11px] text-slate-600 leading-tight mt-0.5">${candidate.puesto_aplicado}</p>
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

  const allCandidates = readCandidates();
  
  containerNuevos.innerHTML = "";
  candidatesContactados.innerHTML = "";
  candidatesPreseleccionados.innerHTML = "";
  candidatesSeleccionados.innerHTML = "";

  const sortOrder = sortSelect ? sortSelect.value : "desc";

  // Distribuir "Nuevos" en la lista principal (horizontal)
  const nuevos = allCandidates.filter(c => c.estado_pipeline === "Nuevo");
  
  nuevos.sort((a, b) => {
    return sortOrder === "desc" ? b.score_ia - a.score_ia : a.score_ia - b.score_ia;
  });

  nuevos.forEach(candidate => {
    containerNuevos.innerHTML += createCandidateCard(candidate);
  });

  // Filtrar el resto del pipeline
  const contactados = allCandidates.filter(c => c.estado_pipeline === "Contactado");
  const preseleccionados = allCandidates.filter(c => c.estado_pipeline === "Preseleccionado");
  const seleccionados = allCandidates.filter(c => c.estado_pipeline === "Seleccionado");

  // Actualizar contadores
  const countNuevos = document.getElementById("count-nuevos");
  const countContactados = document.getElementById("count-contactados");
  const countPreseleccionados = document.getElementById("count-preseleccionados");
  const countSeleccionados = document.getElementById("count-seleccionados");

  if (countNuevos) countNuevos.textContent = nuevosYContactados.length;
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
  setupScoringPanelToggle();
});
