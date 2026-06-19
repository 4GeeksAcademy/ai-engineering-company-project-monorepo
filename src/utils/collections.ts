import {
	Candidate,
	Client,
	SelectionProcess,
	Course,
	SupportTicket,
	Employee,
	Prospect,
} from "../types/models";

export const filterCandidatesByStatus = (
	candidates: Candidate[],
	status: string
): Candidate[] => {
	return candidates.filter((candidate: Candidate) => candidate.status === status);
};

export const filterCandidatesByMinScore = (
	candidates: Candidate[],
	minScore: number
): Candidate[] => {
	return candidates.filter((candidate: Candidate) => candidate.cvScore >= minScore);
};

export const filterClientsBySector = (
	clients: Client[],
	sector: string
): Client[] => {
	return clients.filter((client: Client) => client.sector === sector);
};

export const filterClientsByCountry = (
	clients: Client[],
	country: string
): Client[] => {
	return clients.filter((client: Client) => client.country === country);
};

export const filterProcessesByStatus = (
	processes: SelectionProcess[],
	status: string
): SelectionProcess[] => {
	return processes.filter((process: SelectionProcess) => process.status === status);
};

export const filterCoursesByCategory = (
	courses: Course[],
	category: string
): Course[] => {
	return courses.filter((course: Course) => course.category === category);
};

export const filterActiveCourses = (courses: Course[]): Course[] => {
	return courses.filter((course: Course) => course.isActive === true);
};

export const filterTicketsByPriority = (
	tickets: SupportTicket[],
	priority: string
): SupportTicket[] => {
	return tickets.filter((ticket: SupportTicket) => ticket.priority === priority);
};

export const filterTicketsByChannel = (
	tickets: SupportTicket[],
	channel: string
): SupportTicket[] => {
	return tickets.filter((ticket: SupportTicket) => ticket.channel === channel);
};

export const filterEmployeesByDepartment = (
	employees: Employee[],
	department: string
): Employee[] => {
	return employees.filter(
		(employee: Employee) => employee.department === department
	);
};

export const filterActiveEmployees = (employees: Employee[]): Employee[] => {
	return employees.filter((employee: Employee) => employee.isActive === true);
};

export const filterProspectsByStage = (
	prospects: Prospect[],
	stage: string
): Prospect[] => {
	return prospects.filter((prospect: Prospect) => prospect.stage === stage);
};

export const filterProspectsBySource = (
	prospects: Prospect[],
	source: string
): Prospect[] => {
	return prospects.filter((prospect: Prospect) => prospect.source === source);
};

export const sortCandidatesByScore = (
	candidates: Candidate[],
	order: string
): Candidate[] => {
	return [...candidates].sort((a: Candidate, b: Candidate) => {
		if (order === "desc") {
			return b.cvScore - a.cvScore;
		}

		return a.cvScore - b.cvScore;
	});
};

export const sortClientsByRevenue = (
	clients: Client[],
	order: string
): Client[] => {
	return [...clients].sort((a: Client, b: Client) => {
		if (order === "desc") {
			return b.annualRevenue - a.annualRevenue;
		}

		return a.annualRevenue - b.annualRevenue;
	});
};

export const sortCoursesByPrice = (
	courses: Course[],
	order: string
): Course[] => {
	return [...courses].sort((a: Course, b: Course) => {
		if (order === "desc") {
			return b.price - a.price;
		}

		return a.price - b.price;
	});
};

export const sortTicketsByCreatedAt = (
	tickets: SupportTicket[],
	order: string
): SupportTicket[] => {
	return [...tickets].sort((a: SupportTicket, b: SupportTicket) => {
		const firstDate: number = a.createdAt.getTime();
		const secondDate: number = b.createdAt.getTime();

		if (order === "desc") {
			return secondDate - firstDate;
		}

		return firstDate - secondDate;
	});
};

export const sortProspectsByValue = (
	prospects: Prospect[],
	order: string
): Prospect[] => {
	return [...prospects].sort((a: Prospect, b: Prospect) => {
		if (order === "desc") {
			return b.estimatedValue - a.estimatedValue;
		}

		return a.estimatedValue - b.estimatedValue;
	});
};

export const sortEmployeesByHireDate = (
	employees: Employee[],
	order: string
): Employee[] => {
	return [...employees].sort((a: Employee, b: Employee) => {
		const firstDate: number = a.hireDate.getTime();
		const secondDate: number = b.hireDate.getTime();

		if (order === "desc") {
			return secondDate - firstDate;
		}

		return firstDate - secondDate;
	});
};
