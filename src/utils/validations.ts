import {
	Candidate,
	Client,
	SelectionProcess,
	Course,
	SupportTicket,
	Employee,
	Prospect,
} from "../types/models";

export const isValidEmail = (email: string): boolean => {
	const trimmedEmail: string = email.trim();
	const atIndex: number = trimmedEmail.indexOf("@");

	if (atIndex <= 0) {
		return false;
	}

	const dotAfterAtIndex: number = trimmedEmail.indexOf(".", atIndex + 1);
	return dotAfterAtIndex > atIndex + 1;
};

export const validateCandidate = (candidate: Candidate): boolean => {
	if (candidate.fullName.trim().length === 0) {
		return false;
	}

	if (!isValidEmail(candidate.email)) {
		return false;
	}

	if (candidate.cvScore < 0 || candidate.cvScore > 100) {
		return false;
	}

	if (candidate.yearsOfExperience < 0) {
		return false;
	}

	if (candidate.skills.length === 0) {
		return false;
	}

	if (candidate.phone.trim().length === 0) {
		return false;
	}

	return true;
};

export const validateClient = (client: Client): boolean => {
	const validSectors: string[] = ["tecnología", "retail", "finanzas"];
	const validCountries: string[] = ["España", "EstadosUnidos"];

	if (client.companyName.trim().length === 0) {
		return false;
	}

	if (!isValidEmail(client.contactEmail)) {
		return false;
	}

	if (!validSectors.includes(client.sector)) {
		return false;
	}

	if (!validCountries.includes(client.country)) {
		return false;
	}

	if (client.activeContracts < 0) {
		return false;
	}

	if (client.annualRevenue <= 0) {
		return false;
	}

	return true;
};

export const validateSelectionProcess = (
	process: SelectionProcess
): boolean => {
	if (process.position.trim().length === 0) {
		return false;
	}

	if (process.consultantName.trim().length === 0) {
		return false;
	}

	if (process.deadline.getTime() <= process.startDate.getTime()) {
		return false;
	}

	if (process.cvsReceived < 0 || process.cvsReceived > 200) {
		return false;
	}

	if (process.clientId <= 0) {
		return false;
	}

	return true;
};

export const validateCourse = (course: Course): boolean => {
	const validCategories: string[] = [
		"liderazgo",
		"comunicación",
		"gestiónDeEquipos",
	];
	const validFormats: string[] = ["curso", "taller", "webinar"];

	if (course.title.trim().length === 0) {
		return false;
	}

	if (!validCategories.includes(course.category)) {
		return false;
	}

	if (!validFormats.includes(course.format)) {
		return false;
	}

	if (course.durationHours <= 0) {
		return false;
	}

	if (course.price < 0) {
		return false;
	}

	if (course.maxCapacity <= 0) {
		return false;
	}

	if (course.enrolledCount > course.maxCapacity) {
		return false;
	}

	return true;
};

export const validateSupportTicket = (ticket: SupportTicket): boolean => {
	const validChannels: string[] = ["teléfono", "email", "chat"];
	const validPriorities: string[] = ["baja", "media", "alta", "crítica"];

	if (ticket.agentName.trim().length === 0) {
		return false;
	}

	if (!validChannels.includes(ticket.channel)) {
		return false;
	}

	if (!validPriorities.includes(ticket.priority)) {
		return false;
	}

	if (ticket.slaTarget <= 0) {
		return false;
	}

	if (ticket.clientId <= 0) {
		return false;
	}

	if (
		ticket.resolvedAt !== null &&
		ticket.resolvedAt.getTime() <= ticket.createdAt.getTime()
	) {
		return false;
	}

	if (ticket.resolutionTimeHours !== null && ticket.resolutionTimeHours <= 0) {
		return false;
	}

	return true;
};

export const validateEmployee = (employee: Employee): boolean => {
	const validDepartments: string[] = [
		"selección",
		"formación",
		"soporte",
		"ventas",
		"marketing",
		"rrhh",
		"tecnología",
		"dirección",
	];

	if (employee.fullName.trim().length === 0) {
		return false;
	}

	if (!isValidEmail(employee.email)) {
		return false;
	}

	if (!validDepartments.includes(employee.department)) {
		return false;
	}

	if (employee.vacationDaysUsed > employee.vacationDaysTotal) {
		return false;
	}

	if (employee.vacationDaysTotal < 0) {
		return false;
	}

	return true;
};

export const validateProspect = (prospect: Prospect): boolean => {
	const validSources: string[] = ["linkedIn", "referral", "web", "evento"];
	const validStages: string[] = [
		"primerContacto",
		"seguimiento",
		"propuesta",
		"negociación",
		"cerradoGanado",
		"cerradoPerdido",
	];

	if (prospect.companyName.trim().length === 0) {
		return false;
	}

	if (prospect.contactName.trim().length === 0) {
		return false;
	}

	if (!isValidEmail(prospect.contactEmail)) {
		return false;
	}

	if (!validSources.includes(prospect.source)) {
		return false;
	}

	if (!validStages.includes(prospect.stage)) {
		return false;
	}

	if (prospect.estimatedValue <= 0) {
		return false;
	}

	if (prospect.assignedSDR.trim().length === 0) {
		return false;
	}

	return true;
};
