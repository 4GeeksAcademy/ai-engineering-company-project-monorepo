"use client";

import { useState } from "react";
import Link from "next/link";
import type { Candidate, Vacancy } from "../../../../src/types/models";
import { calculateCandidateScore } from "../../../../src/utils/transformations";

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

export interface FullCandidate {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  puesto_aplicado: string;
  score_ia: number;
  skills_clave: string[];
  razonamiento_corto: string;
  estado_pipeline: "Nuevo" | "Contactado" | "Preseleccionado" | "Seleccionado";
}

const fullCandidatesDataset: FullCandidate[] = [
  {
    id: "C-001",
    nombre: "Alicia Romero",
    email: "alicia.romero.work@example.com",
    telefono: "+34600111222",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 92,
    skills_clave: ["Headhunting", "Entrevista por competencias", "ATS", "Ingles C1"],
    razonamiento_corto: "Alta compatibilidad con procesos de mandos medios/directivos, experiencia previa con volumen alto de vacantes y excelente calidad de feedback al cliente.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-002",
    nombre: "Bruno Salas",
    email: "bruno.salas.work@example.com",
    telefono: "+34600333444",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 78,
    skills_clave: ["Sourcing", "LinkedIn Recruiter", "CRM", "Comunicacion"],
    razonamiento_corto: "Buen potencial para cubrir vacantes tecnicas y gestionar pipeline, pero con menor experiencia en posiciones directivas frente a los perfiles top.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-003",
    nombre: "Carla Nuñez",
    email: "carla.nunez.work@example.com",
    telefono: "+34600555666",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 64,
    skills_clave: ["Criba curricular", "Entrevistas", "Reporteria", "Trabajo en equipo"],
    razonamiento_corto: "Perfil operativo estable para etapas de preseleccion; requiere soporte adicional en presentaciones ejecutivas y trato consultivo con clientes.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-004",
    nombre: "Diego Mendez",
    email: "diego.mendez.work@example.com",
    telefono: "+34600777888",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 47,
    skills_clave: ["Administracion", "Excel", "Seguimiento"],
    razonamiento_corto: "Experiencia relevante en soporte administrativo pero brecha en sourcing especializado y evaluacion de perfiles senior.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-005",
    nombre: "Elena Pardo",
    email: "elena.pardo.work@example.com",
    telefono: "+34600999000",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 85,
    skills_clave: ["Evaluacion por competencias", "Data recruiting", "Stakeholder management", "Ingles B2"],
    razonamiento_corto: "Muy buen equilibrio entre analitica y ejecucion de procesos; destaca en comunicacion con hiring managers y cierre de vacantes criticas.",
    estado_pipeline: "Nuevo",
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
    estado_pipeline: "Nuevo",
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
    estado_pipeline: "Nuevo",
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
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-009",
    nombre: "Irene Lozano",
    email: "irene.lozano.work@example.com",
    telefono: "+34604445566",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 88,
    skills_clave: ["Headhunting", "People Analytics", "ATS", "Ingles C1"],
    razonamiento_corto: "Perfil con alto encaje para procesos de seleccion consultiva y seguimiento de KPI de reclutamiento en clientes enterprise.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-010",
    nombre: "Javier Cano",
    email: "javier.cano.work@example.com",
    telefono: "+34605556677",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 81,
    skills_clave: ["Sourcing tecnico", "Entrevistas estructuradas", "CRM", "Comunicacion"],
    razonamiento_corto: "Buen rendimiento en vacantes tecnologicas y coordinacion con hiring managers; requiere refuerzo puntual en negociacion salarial.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-011",
    nombre: "Karen Vega",
    email: "karen.vega.work@example.com",
    telefono: "+34606667788",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 69,
    skills_clave: ["Criba curricular", "Entrevistas", "Seguimiento", "Reporting"],
    razonamiento_corto: "Aporta consistencia operativa en fases iniciales y buena documentacion del pipeline, con margen de mejora en cierres complejos.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-012",
    nombre: "Luis Aranda",
    email: "luis.aranda.work@example.com",
    telefono: "+34607778899",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 53,
    skills_clave: ["ATS", "Coordinacion", "Excel", "Atencion al cliente"],
    razonamiento_corto: "Perfil util para soporte de procesos en volumen; necesita acompanamiento para entrevistas por competencias en posiciones senior.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-013",
    nombre: "Marta Prieto",
    email: "marta.prieto.work@example.com",
    telefono: "+34608889900",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 90,
    skills_clave: ["Stakeholder management", "Negociacion", "Headhunting", "Ingles C2"],
    razonamiento_corto: "Excelente capacidad de interlocucion con clientes y candidatos clave; destaca en cierre de procesos de alta criticidad.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-014",
    nombre: "Nicolas Rios",
    email: "nicolas.rios.work@example.com",
    telefono: "+34609990011",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 58,
    skills_clave: ["Sourcing", "LinkedIn Recruiter", "ATS", "Onboarding"],
    razonamiento_corto: "Buen desempeño en captacion de perfiles intermedios y gestion de onboarding, con menor experiencia en roles ejecutivos.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-015",
    nombre: "Olga Serrano",
    email: "olga.serrano.work@example.com",
    telefono: "+34601112244",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 76,
    skills_clave: ["Entrevistas por competencias", "Employer branding", "Data recruiting", "Ingles B2"],
    razonamiento_corto: "Candidata equilibrada para procesos integrales de seleccion; fortalece la experiencia de candidato y la comunicacion con cliente.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-016",
    nombre: "Pablo Rivas",
    email: "pablo.rivas.work@example.com",
    telefono: "+34601223355",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 73,
    skills_clave: ["Sourcing", "ATS", "Entrevistas", "Comunicacion"],
    razonamiento_corto: "Perfil versatil para cubrir vacantes de volumen medio, con buena capacidad de seguimiento y coordinacion con hiring managers.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-017",
    nombre: "Quim Beltran",
    email: "quim.beltran.work@example.com",
    telefono: "+34601334466",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 66,
    skills_clave: ["Criba curricular", "LinkedIn Recruiter", "Reporting", "Onboarding"],
    razonamiento_corto: "Rinde bien en fases de preseleccion y comunicacion con candidatos, con oportunidad de mejora en cierres de alta complejidad.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-018",
    nombre: "Raquel Dominguez",
    email: "raquel.dominguez.work@example.com",
    telefono: "+34601445577",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 91,
    skills_clave: ["Headhunting", "Negociacion", "Stakeholder management", "Ingles C1"],
    razonamiento_corto: "Candidata fuerte para procesos estrategicos y cierres complejos, con alto nivel de interlocucion con cliente.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-019",
    nombre: "Sergio Molina",
    email: "sergio.molina.work@example.com",
    telefono: "+34601556688",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 57,
    skills_clave: ["ATS", "Excel", "Atencion al cliente", "Seguimiento"],
    razonamiento_corto: "Buen soporte operativo para procesos continuos; requiere acompanamiento en entrevistas por competencias avanzadas.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-020",
    nombre: "Tamara Solis",
    email: "tamara.solis.work@example.com",
    telefono: "+34601667799",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 83,
    skills_clave: ["People Analytics", "Data recruiting", "ATS", "Ingles B2"],
    razonamiento_corto: "Combina enfoque analitico con buena ejecucion de pipeline, ideal para equipos con objetivos de conversion.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-021",
    nombre: "Ulises Marquez",
    email: "ulises.marquez.work@example.com",
    telefono: "+34601778800",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 49,
    skills_clave: ["Administracion", "Excel", "Coordinacion", "CRM"],
    razonamiento_corto: "Aporta orden en procesos y cumplimiento de SLAs, con margen de crecimiento en sourcing especializado.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-022",
    nombre: "Valeria Ochoa",
    email: "valeria.ochoa.work@example.com",
    telefono: "+34601889911",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 87,
    skills_clave: ["Entrevista por competencias", "Headhunting", "Employer branding", "Ingles C1"],
    razonamiento_corto: "Muy buen encaje en procesos consultivos de punta a punta y excelente experiencia de candidato.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-023",
    nombre: "Walter Naranjo",
    email: "walter.naranjo.work@example.com",
    telefono: "+34601990022",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 62,
    skills_clave: ["Sourcing tecnico", "Entrevistas estructuradas", "ATS", "Comunicacion"],
    razonamiento_corto: "Buen rendimiento en vacantes tecnicas, con oportunidad de mejora en negociacion salarial de perfiles senior.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-024",
    nombre: "Ximena Fuentes",
    email: "ximena.fuentes.work@example.com",
    telefono: "+34602001133",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 79,
    skills_clave: ["Stakeholder management", "Sourcing", "Onboarding", "Ingles B2"],
    razonamiento_corto: "Perfil equilibrado para gestionar procesos integrales, especialmente util en coordinacion con equipos multidisciplinares.",
    estado_pipeline: "Nuevo",
  },
  {
    id: "C-025",
    nombre: "Yago Prieto",
    email: "yago.prieto.work@example.com",
    telefono: "+34602112244",
    puesto_aplicado: "Consultor/a de Seleccion Senior",
    score_ia: 94,
    skills_clave: ["Headhunting", "Negociacion", "Cierre de ofertas", "Ingles C2"],
    razonamiento_corto: "Excelente perfil para liderar proyectos complejos de seleccion y garantizar cierres exitosos.",
    estado_pipeline: "Nuevo",
  },
];

export interface TicketMessage {
  role: "bot" | "user";
  text: string;
}

export interface SupportTicket {
  ticket_id: string;
  fecha: string;
  cliente_info: {
    nombre: string;
    email: string;
  };
  nivel_gravedad: "Alta" | "Media" | "Baja";
  resumen_problema: string;
  historial_transcripcion: TicketMessage[];
  estado: "Abierto" | "Resuelto";
}

const seedTicketsData: SupportTicket[] = [
  {
    ticket_id: "TK-240601",
    fecha: "2026-06-10 09:35",
    cliente_info: { nombre: "RetailNova", email: "soporte@retailnova.example.com" },
    nivel_gravedad: "Alta",
    resumen_problema: "Fallo crítico de sincronización del catálogo de productos con el CRM central.",
    historial_transcripcion: [
      { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indícame el nombre de tu empresa." },
      { role: "user", text: "RetailNova" },
      { role: "bot", text: "Comparte tu email de contacto corporativo." },
      { role: "user", text: "soporte@retailnova.example.com" },
      { role: "bot", text: "Describe brevemente la incidencia principal." },
      { role: "user", text: "Desde la última actualización, la API de sincronización con nuestro CRM no actualiza el stock y devuelve un timeout." }
    ],
    estado: "Abierto"
  },
  {
    ticket_id: "TK-240602",
    fecha: "2026-06-11 14:20",
    cliente_info: { nombre: "FinAxis Group", email: "mesa.ayuda@finaxis.example.com" },
    nivel_gravedad: "Media",
    resumen_problema: "Latencia elevada y timeouts intermitentes en el portal de acceso B2B.",
    historial_transcripcion: [
      { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indícame el nombre de tu empresa." },
      { role: "user", text: "FinAxis Group" },
      { role: "bot", text: "Comparte tu email de contacto corporativo." },
      { role: "user", text: "mesa.ayuda@finaxis.example.com" },
      { role: "bot", text: "Describe brevemente la incidencia principal." },
      { role: "user", text: "Reportamos tiempos de carga superiores a 15 segundos en el portal B2B, afectando a la operativa de los asesores." }
    ],
    estado: "Abierto"
  },
  {
    ticket_id: "TK-240603",
    fecha: "2026-06-12 11:05",
    cliente_info: { nombre: "TechBridge", email: "it@techbridge.example.com" },
    nivel_gravedad: "Baja",
    resumen_problema: "Solicitud de asistencia para la configuración de webhooks y notificaciones.",
    historial_transcripcion: [
      { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indícame el nombre de tu empresa." },
      { role: "user", text: "TechBridge" },
      { role: "bot", text: "Comparte tu email de contacto corporativo." },
      { role: "user", text: "it@techbridge.example.com" },
      { role: "bot", text: "Describe brevemente la incidencia principal." },
      { role: "user", text: "Necesitamos documentación adicional o soporte para configurar el envío de eventos vía webhook hacia nuestro ERP." }
    ],
    estado: "Resuelto"
  },
  {
    ticket_id: "TK-240604",
    fecha: "2026-06-14 10:00",
    cliente_info: { nombre: "InnoTech", email: "dev@innotech.example.com" },
    nivel_gravedad: "Media",
    resumen_problema: "Divergencia de datos en la generación de reportes consolidados del módulo financiero.",
    historial_transcripcion: [],
    estado: "Abierto"
  },
  {
    ticket_id: "TK-240605",
    fecha: "2026-06-14 11:30",
    cliente_info: { nombre: "Global Retail", email: "ops@globalretail.example.com" },
    nivel_gravedad: "Baja",
    resumen_problema: "Consulta operativa sobre la importación masiva de perfiles de usuario vía CSV.",
    historial_transcripcion: [],
    estado: "Abierto"
  },
  {
    ticket_id: "TK-240606",
    fecha: "2026-06-14 15:45",
    cliente_info: { nombre: "SecureBank", email: "security@securebank.example.com" },
    nivel_gravedad: "Alta",
    resumen_problema: "Auditoría de seguridad reporta vulnerabilidad potencial en la autenticación SSO.",
    historial_transcripcion: [],
    estado: "Abierto"
  }
];

export default function BackofficeDashboard() {
  const [activeDepartment, setActiveDepartment] = useState<string>("operaciones-seleccion");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchId, setSearchId] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [searchSalary, setSearchSalary] = useState<string>("");
  const [searchResult, setSearchResult] = useState<string>("Sin ejecución todavía.");

  // Chatbot State para Soporte al Cliente
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([
    { sender: "bot", text: "Hola. Por favor describe tu incidencia de soporte para evaluarla con triaje IA." },
  ]);
  const [ticketEscalated, setTicketEscalated] = useState(false);

  // Tickets Board State
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>(seedTicketsData);
  const [ticketSortOrder, setTicketSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailChatInput, setDetailChatInput] = useState("");

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Incidencia analizada por Triaje IA: "${userText}". Asignando nivel de prioridad ALTA a soporte especializado.` },
      ]);
      setTicketEscalated(true);
    }, 600);
  };

  const handleDetailChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailChatInput.trim() || !selectedTicket) return;

    const newMsg: TicketMessage = { role: "user", text: detailChatInput };
    const updatedTickets = ticketsList.map((t) => {
      if (t.ticket_id !== selectedTicket.ticket_id) return t;
      return {
        ...t,
        historial_transcripcion: [...t.historial_transcripcion, newMsg],
      };
    });

    setTicketsList(updatedTickets);
    setSelectedTicket((prev) =>
      prev ? { ...prev, historial_transcripcion: [...prev.historial_transcripcion, newMsg] } : null
    );
    setDetailChatInput("");
  };

  const toggleTicketStatus = (ticketId: string) => {
    setTicketsList((prev) =>
      prev.map((t) => {
        if (t.ticket_id !== ticketId) return t;
        const newStatus = t.estado === "Abierto" ? "Resuelto" : "Abierto";
        return { ...t, estado: newStatus };
      })
    );
    if (selectedTicket && selectedTicket.ticket_id === ticketId) {
      setSelectedTicket((prev) => (prev ? { ...prev, estado: prev.estado === "Abierto" ? "Resuelto" : "Abierto" } : null));
    }
  };

  const candidatesPerPage = 5;

  const [candidatesList, setCandidatesList] = useState<FullCandidate[]>(fullCandidatesDataset);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const advanceCandidateStatus = (id: string) => {
    setCandidatesList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        let nextStatus: FullCandidate["estado_pipeline"] = c.estado_pipeline;
        if (c.estado_pipeline === "Nuevo") nextStatus = "Contactado";
        else if (c.estado_pipeline === "Contactado") nextStatus = "Preseleccionado";
        else if (c.estado_pipeline === "Preseleccionado") nextStatus = "Seleccionado";
        return { ...c, estado_pipeline: nextStatus };
      })
    );
  };

  const filteredByPipeline = candidatesList.filter((c) => {
    if (pipelineFilter === "contacted") return c.estado_pipeline === "Contactado";
    if (pipelineFilter === "preselected") return c.estado_pipeline === "Preseleccionado";
    if (pipelineFilter === "selected") return c.estado_pipeline === "Seleccionado";
    return true;
  });

  const sortedCandidates = [...filteredByPipeline].sort((a, b) =>
    sortOrder === "desc" ? b.score_ia - a.score_ia : a.score_ia - b.score_ia
  );

  const totalItems = sortedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / candidatesPerPage));
  const startIndex = (currentPage - 1) * candidatesPerPage;
  const endIndex = Math.min(startIndex + candidatesPerPage, totalItems);
  const currentCandidates = sortedCandidates.slice(startIndex, endIndex);



  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 antialiased font-sans">
      <header className="sticky top-0 z-50 border-b border-slate-300 bg-blue-900/95 backdrop-blur text-white">
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-200">Nexova Solutions</p>
            <h1 className="text-xl font-bold sm:text-2xl">Panel Administrativo por Departamentos</h1>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 transition hover:bg-blue-100"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Lateral Fijo de Departamentos */}
        <aside className="w-full md:w-[280px] shrink-0 rounded-xl border border-blue-200 bg-white p-4 shadow-sm md:sticky md:top-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-900">Departamentos</h2>
          <nav className="mt-3">
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("operaciones-seleccion")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "operaciones-seleccion" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Scoring IA
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("soporte-cliente")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "soporte-cliente" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Soporte al Cliente (Triaje IA)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("formacion-corporativa")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "formacion-corporativa" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Formacion Corporativa
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("ventas-desarrollo")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "ventas-desarrollo" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Ventas y Desarrollo
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("marketing-comunicacion")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "marketing-comunicacion" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Marketing y Comunicacion
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("recursos-humanos")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "recursos-humanos" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Recursos Humanos
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("tecnologia-infraestructura")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "tecnologia-infraestructura" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Tecnologia e Infraestructura
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDepartment("direccion-ejecutiva")}
                  className={`w-full text-left rounded-md px-3 py-2 transition ${
                    activeDepartment === "direccion-ejecutiva" ? "bg-blue-100 font-semibold text-blue-900" : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Direccion Ejecutiva
                </button>
              </li>
            </ul>
          </nav>

          <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Aplicaciones IA</h3>
            <ul className="mt-2 space-y-2 text-xs">
              <li className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <button type="button" onClick={() => setActiveDepartment("operaciones-seleccion")} className="font-medium text-blue-900 hover:underline">Scoring IA</button>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">Activo</span>
              </li>
              <li className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <button type="button" onClick={() => setActiveDepartment("soporte-cliente")} className="font-medium text-blue-900 hover:underline">Ticketing IA</button>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">Listo</span>
              </li>
            </ul>
          </section>
        </aside>

        {/* Área Contenido Principal Deducida por el Departamento Activo */}
        <section className="flex-1 w-full space-y-6">
          {activeDepartment === "operaciones-seleccion" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-blue-950">Operaciones de Seleccion</h2>
                  <p className="mt-1 text-sm text-slate-700">Cribado automatizado y ranking dinamico en tiempo real.</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Javier Almeida</span>
              </header>

              <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                <h4 className="text-sm font-semibold text-blue-950">Utilidades de Procesamiento (Hito 2)</h4>
                <p className="mt-1 text-xs text-slate-700">Resumen en tiempo real usando agregaciones y búsquedas sobre la data del panel.</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <article className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Candidatos Evaluados</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">{candidatesList.length}</p>
                  </article>
                  <article className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Salario Promedio Deseado</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">$51,200</p>
                  </article>
                  <article className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold font-bold">Fill Rate Pipeline</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">80%</p>
                  </article>
                  <article className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold font-bold">Top Skill</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Headhunting ({candidatesList.filter(c => c.skills_clave.includes("Headhunting")).length})</p>
                  </article>
                </div>

                <div className="mt-4 grid gap-2 lg:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Buscar por ID (ej. C-001)"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Buscar por Email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Búsqueda binaria salario max"
                    value={searchSalary}
                    onChange={(e) => setSearchSalary(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      let resId = "No encontrado";
                      let resEmail = "No encontrado";

                      if (searchId.trim()) {
                        const found = candidatesList.find((c) => c.id.toLowerCase() === searchId.trim().toLowerCase());
                        if (found) resId = found.nombre;
                      }
                      if (searchEmail.trim()) {
                        const found = candidatesList.find((c) => c.email.toLowerCase() === searchEmail.trim().toLowerCase());
                        if (found) resEmail = found.nombre;
                      }
                      setSearchResult(`ID: ${resId} | Email: ${resEmail}`);
                    }}
                    className="rounded-md bg-blue-900 text-white font-semibold text-xs py-1.5 hover:bg-blue-800 transition"
                  >
                    Ejecutar búsquedas
                  </button>
                </div>
                <p className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">{searchResult}</p>
              </section>

              {/* Pipeline de Seguimiento 4 Etapas */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-blue-950">Pipeline de Seguimiento</h3>
                    <p className="text-xs text-slate-600">Haz clic en cualquier etapa para filtrar al instante la lista de candidatos.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Ordenar:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="desc">Mayor Score primero</option>
                      <option value="asc">Menor Score primero</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPipelineFilter("all")}
                    className={`flex-1 min-w-[130px] rounded-xl border p-3 text-left transition flex items-center justify-between ${
                      pipelineFilter === "all" ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600" : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Candidatos</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{candidatesList.length}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPipelineFilter("contacted")}
                    className={`flex-1 min-w-[130px] rounded-xl border p-3 text-left transition flex items-center justify-between ${
                      pipelineFilter === "contacted" ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600" : "border-blue-200 bg-white hover:border-blue-400"
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Contactados</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{candidatesList.filter(c => c.estado_pipeline === "Contactado").length}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPipelineFilter("preselected")}
                    className={`flex-1 min-w-[130px] rounded-xl border p-3 text-left transition flex items-center justify-between ${
                      pipelineFilter === "preselected" ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600" : "border-indigo-200 bg-white hover:border-indigo-400"
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Preseleccionados</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{candidatesList.filter(c => c.estado_pipeline === "Preseleccionado").length}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPipelineFilter("selected")}
                    className={`flex-1 min-w-[130px] rounded-xl border p-3 text-left transition flex items-center justify-between ${
                      pipelineFilter === "selected" ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600" : "border-emerald-200 bg-white hover:border-emerald-400"
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Seleccionados</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{candidatesList.filter(c => c.estado_pipeline === "Seleccionado").length}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  </button>
                </div>
              </div>

              {/* Lista Candidatos con Tarjeta Rica del Monorepo */}
              <div className="mt-6 space-y-4">
                {currentCandidates.map((candidate: FullCandidate) => {
                  const getNextState = (current: FullCandidate["estado_pipeline"]) => {
                    if (current === "Nuevo") return "Contactado";
                    if (current === "Contactado") return "Preseleccionado";
                    if (current === "Preseleccionado") return "Seleccionado";
                    return null;
                  };
                  const nextState = getNextState(candidate.estado_pipeline);

                  return (
                    <article key={candidate.id} className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm transition hover:border-blue-400">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">{candidate.id}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{candidate.estado_pipeline}</span>
                            <h4 className="font-bold text-blue-950 text-base">{candidate.nombre}</h4>
                          </div>
                          <p className="text-xs text-slate-600">{candidate.puesto_aplicado} • {candidate.email} • {candidate.telefono}</p>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {candidate.skills_clave.map((sk) => (
                              <span key={sk} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-200">
                                {sk}
                              </span>
                            ))}
                          </div>

                          <div className="pt-2 flex flex-wrap gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => toggleReasoning(candidate.id)}
                              className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                            >
                              <span>Ver razonamiento IA</span>
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </button>
                            <a href={`mailto:${candidate.email}`} className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50">Email</a>
                            <a href={`tel:${candidate.telefono}`} className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50">Llamar</a>
                          </div>
                        </div>

                        <div className="text-right sm:w-40 flex sm:flex-col justify-between items-end gap-2">
                          <div>
                            <span className="text-2xl font-black text-blue-900 block">{candidate.score_ia}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Score IA / 100</span>
                          </div>

                          {nextState ? (
                            <button
                              type="button"
                              onClick={() => advanceCandidateStatus(candidate.id)}
                              className="w-full rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition text-center leading-tight"
                            >
                              Marcar como {nextState}
                            </button>
                          ) : (
                            <span className="w-full rounded-md bg-emerald-100 border border-emerald-300 px-2 py-1.5 text-xs font-bold text-emerald-800 text-center block">
                              Seleccionado
                            </span>
                          )}
                        </div>
                      </div>

                      {expandedReasoning[candidate.id] && (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950 leading-relaxed">
                          <strong>Razonamiento IA:</strong> {candidate.razonamiento_corto}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Paginación */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-semibold text-slate-700">
                <span>Mostrando {startIndex + 1}-{endIndex} de {totalItems} candidatos</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="rounded-md bg-blue-100 px-2.5 py-1 text-blue-900 font-bold">Página {currentPage} de {totalPages}</span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </article>
          )}

          {activeDepartment === "soporte-cliente" && (
            <>
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-blue-950">Panel de Agentes - Tickets Escalados</h2>
                  <p className="mt-1 text-sm text-slate-700">SLA comprometido en 24h, promedio real en 48h y backlog con baja visibilidad.</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Roberto Diaz</span>
              </header>

              <section className="mt-6 grid gap-6 md:grid-cols-2">
                {/* Chatbot de Triaje IA */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-semibold text-blue-950">Chatbot de Triaje Inteligente</h3>
                  <p className="mt-1 text-xs text-slate-600">Filtra incidencias y escala automaticamente al panel de agentes.</p>

                  <div className="mt-3 h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`p-2 rounded-md ${msg.sender === "bot" ? "bg-blue-50 text-blue-900 border border-blue-200" : "bg-slate-100 text-slate-900 text-right font-medium"}`}>
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Describe tu incidencia..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button type="submit" className="rounded-md bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">
                      Enviar
                    </button>
                  </form>

                  {ticketEscalated && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium">
                      ✓ Ticket escalado correctamente con nivel de prioridad alta.
                    </div>
                  )}
                </div>

                {/* Métricas dinámicas de Soporte */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-base font-semibold text-blue-950">Panel de Agentes &amp; SLAs</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Activos</span>
                        <p className="text-xl font-bold text-blue-950 mt-0.5">{ticketsList.filter(t => t.estado === "Abierto").length}</p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Alta Prioridad</span>
                        <p className="text-xl font-bold text-rose-700 mt-0.5">{ticketsList.filter(t => t.nivel_gravedad === "Alta" && t.estado === "Abierto").length}</p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Resueltos</span>
                        <p className="text-xl font-bold text-emerald-700 mt-0.5">{ticketsList.filter(t => t.estado === "Resuelto").length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Listado de Tickets */}
              <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-blue-950">Tickets en seguimiento</h3>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sortTickets" className="text-xs font-medium text-slate-600">Ordenar por:</label>
                    <select
                      id="sortTickets"
                      value={ticketSortOrder}
                      onChange={(e) => setTicketSortOrder(e.target.value as "desc" | "asc")}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="desc">Mayor gravedad primero</option>
                      <option value="asc">Menor gravedad primero</option>
                    </select>
                  </div>
                </header>

                {/* Encabezados */}
                <header className="hidden sm:flex items-center px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="sm:w-1/4">ID / Cliente</div>
                  <div className="sm:w-1/4 px-2">Estado</div>
                  <div className="flex-1 px-4">Descripción de la incidencia</div>
                  <div className="w-[160px] text-right pr-2">Fecha y Gravedad</div>
                </header>

                <div className="mt-2 flex flex-col gap-3">
                  {[...ticketsList]
                    .sort((a, b) => {
                      const order: Record<string, number> = { Alta: 3, Media: 2, Baja: 1 };
                      return ticketSortOrder === "desc"
                        ? (order[b.nivel_gravedad] ?? 0) - (order[a.nivel_gravedad] ?? 0)
                        : (order[a.nivel_gravedad] ?? 0) - (order[b.nivel_gravedad] ?? 0);
                    })
                    .map((ticket) => {
                      const severityStyles: Record<string, string> = {
                        Alta: "border-rose-300 bg-rose-50 text-rose-900",
                        Media: "border-amber-300 bg-amber-50 text-amber-900",
                        Baja: "border-slate-300 bg-slate-50 text-slate-700",
                      };
                      const severityBadge = severityStyles[ticket.nivel_gravedad] || severityStyles.Baja;

                      return (
                        <article
                          key={ticket.ticket_id}
                          className="flex flex-col sm:flex-row sm:items-center rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 transition cursor-pointer"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <div className="sm:w-1/4">
                            <p className="text-xs font-bold text-blue-900">{ticket.ticket_id}</p>
                            <p className="text-xs text-slate-600">{ticket.cliente_info.nombre}</p>
                            <p className="text-[10px] text-slate-500">{ticket.cliente_info.email}</p>
                          </div>
                          <div className="sm:w-1/4 px-2 mt-1 sm:mt-0">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${severityBadge}`}>
                              {ticket.nivel_gravedad}
                            </span>
                            <span className={`ml-1 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${ticket.estado === "Resuelto" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-700"}`}>
                              {ticket.estado}
                            </span>
                          </div>
                          <div className="flex-1 px-0 sm:px-4 mt-1 sm:mt-0">
                            <p className="text-xs text-slate-700 line-clamp-2">{ticket.resumen_problema}</p>
                          </div>
                          <div className="w-full sm:w-[160px] text-left sm:text-right mt-1 sm:mt-0 pr-0 sm:pr-2">
                            <p className="text-[10px] font-semibold text-slate-500">{ticket.fecha}</p>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            </article>

            {/* Modal Overlay de Detalle de Ticket */}
            {selectedTicket && (
              <div className="fixed inset-0 z-40 bg-slate-900/50 p-4 sm:p-6 flex items-start justify-center overflow-y-auto" onClick={() => setSelectedTicket(null)}>
                <article className="mx-auto max-w-4xl w-full rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6 mt-8" onClick={(e) => e.stopPropagation()}>
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Detalle de ticket</p>
                      <h2 className="mt-1 text-2xl font-bold text-blue-950">{selectedTicket.ticket_id}</h2>
                    </div>
                    <button type="button" onClick={() => setSelectedTicket(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                      Cerrar
                    </button>
                  </header>

                  <section className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                    <article>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cliente</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedTicket.cliente_info.nombre}</p>
                      <p className="text-sm text-slate-700">{selectedTicket.cliente_info.email}</p>
                    </article>
                    <article>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                          selectedTicket.nivel_gravedad === "Alta" ? "border-rose-300 bg-rose-50 text-rose-900" :
                          selectedTicket.nivel_gravedad === "Media" ? "border-amber-300 bg-amber-50 text-amber-900" :
                          "border-slate-300 bg-slate-50 text-slate-700"
                        }`}>{selectedTicket.nivel_gravedad}</span>
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${selectedTicket.estado === "Resuelto" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-700"}`}>
                          {selectedTicket.estado}
                        </span>
                      </div>
                    </article>
                  </section>

                  <section className="mt-5">
                    <h3 className="text-sm font-semibold text-blue-950">Resumen del problema</h3>
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{selectedTicket.resumen_problema}</p>
                  </section>

                  {selectedTicket.historial_transcripcion.length > 0 && (
                    <section className="mt-5">
                      <h3 className="text-sm font-semibold text-blue-950">Historial de transcripción</h3>
                      <div className="mt-2 max-h-48 overflow-y-auto grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                        {selectedTicket.historial_transcripcion.map((msg, idx) => (
                          <div key={idx} className={`p-2 rounded-md text-xs ${msg.role === "bot" ? "bg-blue-50 text-blue-900 border border-blue-200" : "bg-white text-slate-900 border border-slate-200 text-right font-medium"}`}>
                            {msg.text}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4">
                    <h3 className="text-sm font-semibold text-blue-950">Canal de seguimiento con cliente</h3>
                    <p className="mt-1 text-xs text-blue-800">Puedes enviar mensajes mientras el ticket esté abierto.</p>
                    <form onSubmit={handleDetailChatSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        placeholder="Escribe una actualización para el cliente..."
                        value={detailChatInput}
                        onChange={(e) => setDetailChatInput(e.target.value)}
                        className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                      />
                      <button type="submit" className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
                        Enviar mensaje
                      </button>
                    </form>
                  </section>

                  <section className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4">
                    <h3 className="text-sm font-semibold text-blue-950">Acciones operativas</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <a href={`mailto:${selectedTicket.cliente_info.email}`} className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 text-center">
                        Contactar Cliente
                      </a>
                      <button type="button" className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100">
                        Videollamada
                      </button>
                      <button type="button" className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100">
                        Invitar Ingeniero
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTicketStatus(selectedTicket.ticket_id)}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                          selectedTicket.estado === "Abierto"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                            : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        }`}
                      >
                        {selectedTicket.estado === "Abierto" ? "Marcar Resuelto" : "Reabrir Ticket"}
                      </button>
                    </div>
                  </section>
                </article>
              </div>
            )}
            </>
          )}
          {activeDepartment === "formacion-corporativa" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-blue-950">Formacion Corporativa</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Elena Vargas</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Catalogo en PDF, inscripciones manuales y escasa trazabilidad de progreso.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Programas activos</span><p className="text-xl font-bold text-slate-900 mt-1">18</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Inscripciones semanales</span><p className="text-xl font-bold text-slate-900 mt-1">94</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Finalizacion de cursos</span><p className="text-xl font-bold text-slate-900 mt-1">58%</p></div>
              </div>
            </article>
          )}

          {activeDepartment === "ventas-desarrollo" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-blue-950">Ventas y Desarrollo de Negocio</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Marcos Ibanez</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Uso inconsistente del CRM y perdida de deals por seguimiento manual.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Deals en pipeline</span><p className="text-xl font-bold text-slate-900 mt-1">73</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>CRM actualizado</span><p className="text-xl font-bold text-amber-700 mt-1">40%</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Conversaciones sin actividad</span><p className="text-xl font-bold text-slate-900 mt-1">21</p></div>
              </div>
            </article>
          )}

          {activeDepartment === "marketing-comunicacion" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-blue-950">Marketing y Comunicacion</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Carmen Ruiz</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Web desactualizada, baja accesibilidad y poca visibilidad de conversion.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Visitas mensuales</span><p className="text-xl font-bold text-slate-900 mt-1">24.8k</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Tasa de conversion</span><p className="text-xl font-bold text-slate-900 mt-1">1.7%</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Contenido trazable</span><p className="text-xl font-bold text-amber-700 mt-1">Parcial</p></div>
              </div>
            </article>
          )}

          {activeDepartment === "recursos-humanos" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-blue-950">Recursos Humanos</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Patricia Solis</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Procesos internos por email y hojas de calculo, sin KPIs consolidados.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Solicitudes pendientes</span><p className="text-xl font-bold text-slate-900 mt-1">39</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Onboarding en curso</span><p className="text-xl font-bold text-slate-900 mt-1">11</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Evaluaciones revisadas</span><p className="text-xl font-bold text-amber-700 mt-1">32%</p></div>
              </div>
            </article>
          )}

          {activeDepartment === "tecnologia-infraestructura" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-blue-950">Tecnologia e Infraestructura</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Sergio Molina</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Stack desconectado, sin telemetria central y despliegues manuales.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Integraciones activas</span><p className="text-xl font-bold text-slate-900 mt-1">4/11</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Servicios sin observabilidad</span><p className="text-xl font-bold text-rose-700 mt-1">6</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Incidentes reportados</span><p className="text-xl font-bold text-slate-900 mt-1">73%</p></div>
              </div>
            </article>
          )}

          {activeDepartment === "direccion-ejecutiva" && (
            <article className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-blue-950">Direccion Ejecutiva</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">Laura Mendoza</span>
              </header>
              <p className="mt-2 text-sm text-slate-700">Decision estrategica basada en reportes manuales con una semana de retraso.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Reportes recibidos</span><p className="text-xl font-bold text-slate-900 mt-1">7/7</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>Tiempo preparacion</span><p className="text-xl font-bold text-rose-700 mt-1">4-8h/mgr</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><span>KPIs en tiempo real</span><p className="text-xl font-bold text-amber-700 mt-1">No disponible</p></div>
              </div>
            </article>
          )}
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-300 bg-white py-4 text-center text-xs text-slate-600">
        <p>© 2026 Nexova Solutions S.L. — Panel Administrativo Departamental. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
