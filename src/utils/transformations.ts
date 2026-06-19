import {
	Candidate,
	Client,
	SelectionProcess,
	Course,
	SupportTicket,
	Employee,
	Prospect,
} from "../types/models";

export const countCandidatesByStatus = (
	candidates: Candidate[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	candidates.forEach((candidate: Candidate) => {
		if (counts[candidate.status] === undefined) {
			counts[candidate.status] = 0;
		}

		counts[candidate.status] += 1;
	});

	return counts;
};

export const countTicketsByChannel = (
	tickets: SupportTicket[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	tickets.forEach((ticket: SupportTicket) => {
		if (counts[ticket.channel] === undefined) {
			counts[ticket.channel] = 0;
		}

		counts[ticket.channel] += 1;
	});

	return counts;
};

export const countTicketsByPriority = (
	tickets: SupportTicket[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	tickets.forEach((ticket: SupportTicket) => {
		if (counts[ticket.priority] === undefined) {
			counts[ticket.priority] = 0;
		}

		counts[ticket.priority] += 1;
	});

	return counts;
};

export const countEmployeesByDepartment = (
	employees: Employee[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	employees.forEach((employee: Employee) => {
		if (counts[employee.department] === undefined) {
			counts[employee.department] = 0;
		}

		counts[employee.department] += 1;
	});

	return counts;
};

export const countCoursesByCategory = (
	courses: Course[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	courses.forEach((course: Course) => {
		if (counts[course.category] === undefined) {
			counts[course.category] = 0;
		}

		counts[course.category] += 1;
	});

	return counts;
};

export const countCoursesByFormat = (
	courses: Course[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	courses.forEach((course: Course) => {
		if (counts[course.format] === undefined) {
			counts[course.format] = 0;
		}

		counts[course.format] += 1;
	});

	return counts;
};

export const countProspectsByStage = (
	prospects: Prospect[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	prospects.forEach((prospect: Prospect) => {
		if (counts[prospect.stage] === undefined) {
			counts[prospect.stage] = 0;
		}

		counts[prospect.stage] += 1;
	});

	return counts;
};

export const countProcessesByStatus = (
	processes: SelectionProcess[]
): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};

	processes.forEach((process: SelectionProcess) => {
		if (counts[process.status] === undefined) {
			counts[process.status] = 0;
		}

		counts[process.status] += 1;
	});

	return counts;
};

export const totalClientRevenue = (clients: Client[]): number => {
	let total: number = 0;

	clients.forEach((client: Client) => {
		total += client.annualRevenue;
	});

	return total;
};

export const averageClientRevenue = (clients: Client[]): number => {
	if (clients.length === 0) {
		return 0;
	}

	const total: number = totalClientRevenue(clients);
	return total / clients.length;
};

export const totalProspectValue = (prospects: Prospect[]): number => {
	let total: number = 0;

	prospects.forEach((prospect: Prospect) => {
		total += prospect.estimatedValue;
	});

	return total;
};

export const averageProspectValue = (prospects: Prospect[]): number => {
	if (prospects.length === 0) {
		return 0;
	}

	const total: number = totalProspectValue(prospects);
	return total / prospects.length;
};

export const averageCvsPerProcess = (processes: SelectionProcess[]): number => {
	if (processes.length === 0) {
		return 0;
	}

	let total: number = 0;

	processes.forEach((process: SelectionProcess) => {
		total += process.cvsReceived;
	});

	return total / processes.length;
};

export const averageTicketResolutionTime = (tickets: SupportTicket[]): number => {
	let total: number = 0;
	let countedTickets: number = 0;

	tickets.forEach((ticket: SupportTicket) => {
		if (ticket.resolutionTimeHours !== null) {
			total += ticket.resolutionTimeHours;
			countedTickets += 1;
		}
	});

	if (countedTickets === 0) {
		return 0;
	}

	return total / countedTickets;
};

export const highestScoringCandidate = (
	candidates: Candidate[]
): Candidate | null => {
	if (candidates.length === 0) {
		return null;
	}

	let highestCandidate: Candidate = candidates[0];

	for (let index: number = 1; index < candidates.length; index += 1) {
		if (candidates[index].cvScore > highestCandidate.cvScore) {
			highestCandidate = candidates[index];
		}
	}

	return highestCandidate;
};

export const lowestScoringCandidate = (
	candidates: Candidate[]
): Candidate | null => {
	if (candidates.length === 0) {
		return null;
	}

	let lowestCandidate: Candidate = candidates[0];

	for (let index: number = 1; index < candidates.length; index += 1) {
		if (candidates[index].cvScore < lowestCandidate.cvScore) {
			lowestCandidate = candidates[index];
		}
	}

	return lowestCandidate;
};

export const highestValueProspect = (
	prospects: Prospect[]
): Prospect | null => {
	if (prospects.length === 0) {
		return null;
	}

	let highestProspect: Prospect = prospects[0];

	for (let index: number = 1; index < prospects.length; index += 1) {
		if (prospects[index].estimatedValue > highestProspect.estimatedValue) {
			highestProspect = prospects[index];
		}
	}

	return highestProspect;
};

export const mostExpensiveCourse = (courses: Course[]): Course | null => {
	if (courses.length === 0) {
		return null;
	}

	let highestPriceCourse: Course = courses[0];

	for (let index: number = 1; index < courses.length; index += 1) {
		if (courses[index].price > highestPriceCourse.price) {
			highestPriceCourse = courses[index];
		}
	}

	return highestPriceCourse;
};

export const slaComplianceRate = (tickets: SupportTicket[]): number => {
	let resolvedTickets: number = 0;
	let compliantTickets: number = 0;

	tickets.forEach((ticket: SupportTicket) => {
		if (ticket.resolutionTimeHours !== null) {
			resolvedTickets += 1;

			if (ticket.resolutionTimeHours <= ticket.slaTarget) {
				compliantTickets += 1;
			}
		}
	});

	if (resolvedTickets === 0) {
		return 0;
	}

	return (compliantTickets / resolvedTickets) * 100;
};

export const courseOccupancyRate = (courses: Course[]): number => {
	if (courses.length === 0) {
		return 0;
	}

	let occupancyTotal: number = 0;

	courses.forEach((course: Course) => {
		const occupancyRate: number = (course.enrolledCount / course.maxCapacity) * 100;
		occupancyTotal += occupancyRate;
	});

	return occupancyTotal / courses.length;
};
