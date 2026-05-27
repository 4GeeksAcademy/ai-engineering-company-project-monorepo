const form = document.getElementById('application-form');
const steps = document.querySelectorAll('.step');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const stepIndicator = document.getElementById('step-indicator');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const DEFAULT_ERROR_MESSAGE = 'Revisa los campos obligatorios del paso actual antes de continuar.';
const INVALID_EMAIL_MESSAGE = 'Introduce un email válido (por ejemplo, nombre@empresa.com).';
const INVALID_PHONE_MESSAGE = 'Introduce un teléfono válido usando solo números y símbolos como +, - o paréntesis.';

let currentStep = 1;
let formData = {};
const totalSteps = steps.length;
let lastInvalidField = null;

function getStepElement(stepNumber) {
	return document.querySelector(`[data-step="${stepNumber}"]`);
}

function addErrorReference(input) {
	if (!input) {
		return;
	}

	const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
	if (!describedBy.includes('error-message')) {
		describedBy.push('error-message');
		input.setAttribute('aria-describedby', describedBy.join(' '));
	}
}

function clearErrorReference(input) {
	if (!input) {
		return;
	}

	const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
	const filtered = describedBy.filter((id) => id !== 'error-message');
	if (filtered.length > 0) {
		input.setAttribute('aria-describedby', filtered.join(' '));
	} else {
		input.removeAttribute('aria-describedby');
	}
}

function markInputInvalid(input) {
	if (!input) {
		return;
	}

	input.setAttribute('aria-invalid', 'true');
	addErrorReference(input);
	if (!lastInvalidField) {
		lastInvalidField = input;
	}
}

function clearStepFieldErrors(step) {
	if (!step) {
		return;
	}

	const stepInputs = step.querySelectorAll('input, select, textarea');
	stepInputs.forEach((input) => {
		input.removeAttribute('aria-invalid');
		clearErrorReference(input);
	});
}

function focusFirstFieldInStep(stepNumber) {
	const step = getStepElement(stepNumber);
	if (!step) {
		return;
	}

	const firstFocusable = step.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
	if (firstFocusable instanceof HTMLElement) {
		firstFocusable.focus();
	}
}

function focusValidationTarget() {
	if (lastInvalidField instanceof HTMLElement) {
		lastInvalidField.focus();
		return;
	}

	if (!errorMessage.classList.contains('hidden')) {
		errorMessage.focus();
	}
}

function showStep(stepNumber) {
	steps.forEach((step) => {
		const isCurrentStep = Number(step.dataset.step) === stepNumber;
		step.classList.toggle('hidden', !isCurrentStep);
		step.setAttribute('aria-hidden', String(!isCurrentStep));
	});

	stepIndicator.textContent = `Paso ${stepNumber} de ${totalSteps}`;
}

function updateButtons() {
	prevBtn.classList.toggle('invisible', currentStep === 1);
	nextBtn.classList.toggle('hidden', currentStep === totalSteps);
	submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidPhone(phone) {
	const trimmedPhone = phone.trim();
	if (!/^\+?[0-9()\-\s]+$/.test(trimmedPhone)) {
		return false;
	}

	const digitsOnly = trimmedPhone.replace(/\D/g, '');
	return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

function validateStep(stepNumber) {
	const step = getStepElement(stepNumber);
	const requiredInputs = step.querySelectorAll('[required]');
	let isValid = true;
	let firstErrorMessage = DEFAULT_ERROR_MESSAGE;
	lastInvalidField = null;
	clearStepFieldErrors(step);

	requiredInputs.forEach((input) => {
		if (input.type === 'radio') {
			const group = step.querySelectorAll(`input[name="${input.name}"]`);
			const oneChecked = Array.from(group).some((radio) => radio.checked);

			if (!oneChecked) {
				isValid = false;
				group.forEach((radio) => markInputInvalid(radio));
			}
			return;
		}

		if (input.type === 'checkbox') {
			if (!input.checked) {
				isValid = false;
				markInputInvalid(input);
			}
			return;
		}

		if (!input.value.trim()) {
			isValid = false;
			markInputInvalid(input);
			return;
		}

		const isEmailField = input.type === 'email' || input.id === 'email' || input.name === 'email';
		if (isEmailField && !isValidEmail(input.value.trim())) {
			isValid = false;
			markInputInvalid(input);
			if (firstErrorMessage === DEFAULT_ERROR_MESSAGE) {
				firstErrorMessage = INVALID_EMAIL_MESSAGE;
			}
			return;
		}

		const isPhoneField = input.type === 'tel' || input.id === 'phone' || input.name === 'phone';
		if (isPhoneField && !isValidPhone(input.value.trim())) {
			isValid = false;
			markInputInvalid(input);
			if (firstErrorMessage === DEFAULT_ERROR_MESSAGE) {
				firstErrorMessage = INVALID_PHONE_MESSAGE;
			}
			return;
		}
	});

	errorMessage.textContent = isValid ? DEFAULT_ERROR_MESSAGE : firstErrorMessage;
	errorMessage.classList.toggle('hidden', isValid);
	return isValid;
}

function validateStepThreeBusinessRules() {
	if (currentStep !== 3) {
		return true;
	}

	const challengeCheckboxes = document.querySelectorAll('[data-step="3"] input[type="checkbox"]');
	const hasAtLeastOneFocus = Array.from(challengeCheckboxes).some((checkbox) => checkbox.checked);

	if (!hasAtLeastOneFocus) {
		challengeCheckboxes.forEach((checkbox) => markInputInvalid(checkbox));
		errorMessage.textContent = 'Selecciona al menos un reto prioritario en el paso 3.';
		errorMessage.classList.remove('hidden');
		return false;
	}

	errorMessage.textContent = DEFAULT_ERROR_MESSAGE;
	return true;
}

function validateStepOneBusinessRules() {
	if (currentStep !== 1) {
		return true;
	}

	const emailInput = document.getElementById('email');
	if (!emailInput) {
		return true;
	}

	if (!isValidEmail(emailInput.value.trim())) {
		markInputInvalid(emailInput);
		errorMessage.textContent = INVALID_EMAIL_MESSAGE;
		errorMessage.classList.remove('hidden');
		return false;
	}

	const phoneInput = document.getElementById('phone');
	if (phoneInput && !isValidPhone(phoneInput.value.trim())) {
		markInputInvalid(phoneInput);
		errorMessage.textContent = INVALID_PHONE_MESSAGE;
		errorMessage.classList.remove('hidden');
		return false;
	}

	return true;
}

function collectStepData(stepNumber) {
	const step = getStepElement(stepNumber);
	const inputs = step.querySelectorAll('input, select, textarea');
	const data = {};

	inputs.forEach((input) => {
		const name = input.id || input.name;
		if (!name) return;

		if (input.type === 'checkbox') {
			data[name] = input.checked;
		} else if (input.type === 'radio') {
			if (input.checked) {
				data[name] = input.value;
			}
		} else {
			data[name] = input.value;
		}
	});

	return data;
}

function goToStep(stepNumber, shouldMoveFocus = true) {
	currentStep = stepNumber;
	showStep(currentStep);
	updateButtons();
	document.getElementById('error-message').classList.add('hidden');
	successMessage.classList.add('hidden');

	if (shouldMoveFocus) {
		window.requestAnimationFrame(() => focusFirstFieldInStep(currentStep));
	}
}

function resetForm() {
	form.reset();
	formData = {};
	errorMessage.textContent = DEFAULT_ERROR_MESSAGE;
	errorMessage.classList.add('hidden');
}

function submitForm(event) {
	event.preventDefault();

	if (!validateStep(currentStep) || !validateStepOneBusinessRules() || !validateStepThreeBusinessRules()) {
		focusValidationTarget();
		return;
	}

	formData = {
		...formData,
		...collectStepData(currentStep),
	};

	console.log('Enviando datos del formulario:', formData);
	errorMessage.classList.add('hidden');
	resetForm();
	currentStep = 1;
	goToStep(currentStep, false);
	successMessage.classList.remove('hidden');
	successMessage.setAttribute('tabindex', '-1');
	successMessage.focus();
}

nextBtn.addEventListener('click', () => {
	if (!validateStep(currentStep) || !validateStepOneBusinessRules() || !validateStepThreeBusinessRules()) {
		focusValidationTarget();
		return;
	}

	formData = {
		...formData,
		...collectStepData(currentStep),
	};

	if (currentStep < totalSteps) {
		goToStep(currentStep + 1, true);
	}
});

prevBtn.addEventListener('click', () => {
	formData = {
		...formData,
		...collectStepData(currentStep),
	};

	successMessage.classList.add('hidden');

	if (currentStep > 1) {
		goToStep(currentStep - 1, true);
	}
});

form.addEventListener('submit', submitForm);

showStep(currentStep);
updateButtons();
