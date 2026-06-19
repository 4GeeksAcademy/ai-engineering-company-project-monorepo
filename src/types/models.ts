// ===== CANDIDATO =====
export interface Candidate {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  yearsOfExperience: number;
  currentPosition: string;
  status: "nuevo" | "enProceso" | "entrevistado" | "contratado" | "descartado";
  cvScore: number;
  appliedDate: Date;
}

// ===== CLIENTE =====
export interface Client {
  id: number;
  companyName: string;
  sector: "tecnología" | "retail" | "finanzas";
  contactName: string;
  contactEmail: string;
  country: "España" | "EstadosUnidos";
  activeContracts: number;
  annualRevenue: number;
}

// ===== PROCESO DE SELECCIÓN =====
export interface SelectionProcess {
  id: number;
  clientId: number;
  position: string;
  status: "briefing" | "criba" | "entrevistas" | "oferta" | "cerrado";
  consultantName: string;
  candidateIds: number[];
  startDate: Date;
  deadline: Date;
  cvsReceived: number;
}

// ===== CURSO DE FORMACIÓN =====
export interface Course {
  id: number;
  title: string;
  category: "liderazgo" | "comunicación" | "gestiónDeEquipos";
  format: "curso" | "taller" | "webinar";
  durationHours: number;
  price: number;
  maxCapacity: number;
  enrolledCount: number;
  startDate: Date;
  isActive: boolean;
}

// ===== TICKET DE SOPORTE =====
export interface SupportTicket {
  id: number;
  clientId: number;
  agentName: string;
  channel: "teléfono" | "email" | "chat";
  priority: "baja" | "media" | "alta" | "crítica";
  status: "abierto" | "enProgreso" | "resuelto" | "escalado";
  createdAt: Date;
  resolvedAt: Date | null;
  resolutionTimeHours: number | null;
  slaTarget: number;
}

// ===== EMPLEADO INTERNO =====
export interface Employee {
  id: number;
  fullName: string;
  email: string;
  department: "selección" | "formación" | "soporte" | "ventas" | "marketing" | "rrhh" | "tecnología" | "dirección";
  position: string;
  hireDate: Date;
  vacationDaysUsed: number;
  vacationDaysTotal: number;
  isActive: boolean;
}

// ===== PROSPECTO DE VENTAS =====
export interface Prospect {
  id: number;
  companyName: string;
  contactName: string;
  contactEmail: string;
  source: "linkedIn" | "referral" | "web" | "evento";
  stage: "primerContacto" | "seguimiento" | "propuesta" | "negociación" | "cerradoGanado" | "cerradoPerdido";
  estimatedValue: number;
  lastActivityDate: Date;
  assignedSDR: string;
}
