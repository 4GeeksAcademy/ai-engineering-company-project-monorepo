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

function showStep(stepNumber) {
	steps.forEach((step) => {
		const isCurrentStep = Number(step.dataset.step) === stepNumber;
		step.classList.toggle('hidden', !isCurrentStep);
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
	const step = document.querySelector(`[data-step="${stepNumber}"]`);
	const requiredInputs = step.querySelectorAll('[required]');
	let isValid = true;
	let firstErrorMessage = DEFAULT_ERROR_MESSAGE;

	requiredInputs.forEach((input) => {
		if (input.type === 'radio') {
			const group = step.querySelectorAll(`input[name="${input.name}"]`);
			const oneChecked = Array.from(group).some((radio) => radio.checked);

			if (!oneChecked) {
				isValid = false;
			}
			return;
		}

		if (input.type === 'checkbox') {
			if (!input.checked) {
				isValid = false;
			}
			return;
		}

		if (!input.value.trim()) {
			isValid = false;
			return;
		}

		const isEmailField = input.type === 'email' || input.id === 'email' || input.name === 'email';
		if (isEmailField && !isValidEmail(input.value.trim())) {
			isValid = false;
			if (firstErrorMessage === DEFAULT_ERROR_MESSAGE) {
				firstErrorMessage = INVALID_EMAIL_MESSAGE;
			}
			return;
		}

		const isPhoneField = input.type === 'tel' || input.id === 'phone' || input.name === 'phone';
		if (isPhoneField && !isValidPhone(input.value.trim())) {
			isValid = false;
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
		errorMessage.textContent = INVALID_EMAIL_MESSAGE;
		errorMessage.classList.remove('hidden');
		return false;
	}

	const phoneInput = document.getElementById('phone');
	if (phoneInput && !isValidPhone(phoneInput.value.trim())) {
		errorMessage.textContent = INVALID_PHONE_MESSAGE;
		errorMessage.classList.remove('hidden');
		return false;
	}

	return true;
}

function collectStepData(stepNumber) {
	const step = document.querySelector(`[data-step="${stepNumber}"]`);
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

function goToStep(stepNumber) {
	currentStep = stepNumber;
	showStep(currentStep);
	updateButtons();
	document.getElementById('error-message').classList.add('hidden');
	successMessage.classList.add('hidden');
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
		return;
	}

	formData = {
		...formData,
		...collectStepData(currentStep),
	};

	console.log('Enviando datos del formulario:', formData);
	errorMessage.classList.add('hidden');
	successMessage.classList.remove('hidden');
	resetForm();
	currentStep = 1;
	showStep(currentStep);
	updateButtons();
}

nextBtn.addEventListener('click', () => {
	if (!validateStep(currentStep) || !validateStepOneBusinessRules() || !validateStepThreeBusinessRules()) {
		return;
	}

	formData = {
		...formData,
		...collectStepData(currentStep),
	};

	if (currentStep < totalSteps) {
		goToStep(currentStep + 1);
	}
});

prevBtn.addEventListener('click', () => {
	formData = {
		...formData,
		...collectStepData(currentStep),
	};

	successMessage.classList.add('hidden');

	if (currentStep > 1) {
		goToStep(currentStep - 1);
	}
});

form.addEventListener('submit', submitForm);

showStep(currentStep);
updateButtons();
