import { Candidate, Vacancy } from "../models/models";

type ValidationResult = {
	valid: boolean;
	errors: string[];
};

export function isValidEmail(email: string): boolean {
	const trimmedEmail = email.trim();
	const atIndex = trimmedEmail.indexOf("@");
	const lastDotIndex = trimmedEmail.lastIndexOf(".");

	return atIndex > 0 && lastDotIndex > atIndex + 1 && lastDotIndex < trimmedEmail.length - 1;
}

export function validateCandidate(candidate: Candidate): ValidationResult {
	const errors: string[] = [];

	if (candidate.yearsOfExperience < 0 || candidate.yearsOfExperience > 50) {
		errors.push("Candidate years of experience must be between 0 and 50.");
	}

	if (candidate.currentSalary <= 0) {
		errors.push("Candidate current salary must be greater than 0.");
	}

	if (candidate.expectedSalary <= 0) {
		errors.push("Candidate expected salary must be greater than 0.");
	}

	if (candidate.skills.length < 1) {
		errors.push("Candidate must have at least one skill.");
	}

	if (!isValidEmail(candidate.email)) {
		errors.push("Candidate email format is invalid.");
	}

	if (candidate.phone.trim().length === 0) {
		errors.push("Candidate phone must not be empty.");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

export function validateVacancy(vacancy: Vacancy): ValidationResult {
	const errors: string[] = [];

	if (vacancy.requiredSkills.length < 1) {
		errors.push("Vacancy must have at least one required skill.");
	}

	if (vacancy.minYearsExperience < 0) {
		errors.push("Vacancy minimum years of experience must be 0 or greater.");
	}

	if (vacancy.maxYearsExperience < vacancy.minYearsExperience) {
		errors.push("Vacancy maximum years of experience must be greater than or equal to the minimum.");
	}

	if (vacancy.salaryRangeMin <= 0) {
		errors.push("Vacancy minimum salary must be greater than 0.");
	}

	if (vacancy.salaryRangeMax <= 0) {
		errors.push("Vacancy maximum salary must be greater than 0.");
	}

	if (vacancy.salaryRangeMax < vacancy.salaryRangeMin) {
		errors.push("Vacancy maximum salary must be greater than or equal to the minimum salary.");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
