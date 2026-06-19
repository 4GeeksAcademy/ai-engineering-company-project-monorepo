import {
	Candidate,
	Client,
	SelectionProcess,
	Course,
	SupportTicket,
	Employee,
	Prospect,
} from "../types/models";

export const linearSearchCandidateById = (
	candidates: Candidate[],
	id: number
): Candidate | null => {
	for (let index: number = 0; index < candidates.length; index += 1) {
		if (candidates[index].id === id) {
			return candidates[index];
		}
	}

	return null;
};

export const linearSearchClientByName = (
	clients: Client[],
	companyName: string
): Client | null => {
	for (let index: number = 0; index < clients.length; index += 1) {
		if (clients[index].companyName === companyName) {
			return clients[index];
		}
	}

	return null;
};

export const linearSearchEmployeeByEmail = (
	employees: Employee[],
	email: string
): Employee | null => {
	for (let index: number = 0; index < employees.length; index += 1) {
		if (employees[index].email === email) {
			return employees[index];
		}
	}

	return null;
};

export const linearSearchTicketById = (
	tickets: SupportTicket[],
	id: number
): SupportTicket | null => {
	for (let index: number = 0; index < tickets.length; index += 1) {
		if (tickets[index].id === id) {
			return tickets[index];
		}
	}

	return null;
};

export const linearSearchCourseByTitle = (
	courses: Course[],
	title: string
): Course | null => {
	for (let index: number = 0; index < courses.length; index += 1) {
		if (courses[index].title === title) {
			return courses[index];
		}
	}

	return null;
};

export const linearSearchProspectByCompany = (
	prospects: Prospect[],
	companyName: string
): Prospect | null => {
	for (let index: number = 0; index < prospects.length; index += 1) {
		if (prospects[index].companyName === companyName) {
			return prospects[index];
		}
	}

	return null;
};

export const linearSearchProcessById = (
	processes: SelectionProcess[],
	id: number
): SelectionProcess | null => {
	for (let index: number = 0; index < processes.length; index += 1) {
		if (processes[index].id === id) {
			return processes[index];
		}
	}

	return null;
};

export const binarySearchCandidateById = (
	candidates: Candidate[],
	id: number
): number => {
	let left: number = 0;
	let right: number = candidates.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (candidates[mid].id === id) {
			return mid;
		}

		if (candidates[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};

export const binarySearchClientById = (
	clients: Client[],
	id: number
): number => {
	let left: number = 0;
	let right: number = clients.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (clients[mid].id === id) {
			return mid;
		}

		if (clients[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};

export const binarySearchEmployeeById = (
	employees: Employee[],
	id: number
): number => {
	let left: number = 0;
	let right: number = employees.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (employees[mid].id === id) {
			return mid;
		}

		if (employees[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};

export const binarySearchTicketById = (
	tickets: SupportTicket[],
	id: number
): number => {
	let left: number = 0;
	let right: number = tickets.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (tickets[mid].id === id) {
			return mid;
		}

		if (tickets[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};

export const binarySearchCourseById = (
	courses: Course[],
	id: number
): number => {
	let left: number = 0;
	let right: number = courses.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (courses[mid].id === id) {
			return mid;
		}

		if (courses[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};

export const binarySearchProspectById = (
	prospects: Prospect[],
	id: number
): number => {
	let left: number = 0;
	let right: number = prospects.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (prospects[mid].id === id) {
			return mid;
		}

		if (prospects[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};

export const binarySearchProcessById = (
	processes: SelectionProcess[],
	id: number
): number => {
	let left: number = 0;
	let right: number = processes.length - 1;

	while (left <= right) {
		const mid: number = Math.floor((left + right) / 2);

		if (processes[mid].id === id) {
			return mid;
		}

		if (processes[mid].id < id) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return -1;
};
