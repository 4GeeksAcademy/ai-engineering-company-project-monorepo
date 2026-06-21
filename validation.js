const form = document.getElementById('patient-form');

if (form) {
	const successMessage = document.getElementById('success-message');
	const globalError = document.getElementById('form-global-error');
	const warningPreferredCombination = document.getElementById('warning-preferred_combination');
	const patientIdWrapper = document.getElementById('patient-id-wrapper');
	const concernCounter = document.getElementById('concern-counter');
	const coverageFieldset = document.getElementById('coverage-fieldset');

	const fieldIds = [
		'first_name',
		'last_name',
		'date_of_birth',
		'email',
		'phone',
		'preferred_language',
		'preferred_clinic',
		'preferred_date',
		'preferred_time',
		'service_type',
		'new_patient',
		'has_insurance',
		'insurance_provider',
		'insurance_member_id',
		'patient_id',
		'health_concern',
		'contact_consent'
	];

	const lowEveningAvailabilityClinics = new Set([
		'HealthCore Austin North',
		'HealthCore San Antonio',
		'HealthCore Orlando',
		'HealthCore Atlanta'
	]);

	const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]{2,50}$/;
	const phoneRegex = /^\+\d[\d\s()-]{6,20}$/;
	const insuranceMemberRegex = /^[A-Za-z0-9]{6,20}$/;
	const patientIdRegex = /^HC-[A-Za-z0-9]{6}$/;

	const getField = (name) => form.elements[name];
	const getFieldElements = (name) => {
		const field = getField(name);
		if (!field) return [];
		if (field instanceof Element) return [field];
		if (typeof field.length === 'number') return Array.from(field);
		return [];
	};

	const updateCoverageFieldsetErrorState = () => {
		if (!coverageFieldset) return;
		const newPatientError = document.getElementById('error-new_patient');
		const hasInsuranceError = document.getElementById('error-has_insurance');
		const hasRadioError =
			(newPatientError && !newPatientError.classList.contains('hidden')) ||
			(hasInsuranceError && !hasInsuranceError.classList.contains('hidden'));

		coverageFieldset.classList.toggle('border-rose-400', hasRadioError);
		coverageFieldset.classList.toggle('bg-rose-50', hasRadioError);
		coverageFieldset.classList.toggle('ring-2', hasRadioError);
		coverageFieldset.classList.toggle('ring-rose-300', hasRadioError);
		coverageFieldset.setAttribute('aria-invalid', hasRadioError ? 'true' : 'false');
	};

	const showError = (name, message) => {
		const fields = getFieldElements(name);
		const errorElement = document.getElementById(`error-${name}`);
		if (!errorElement) return;
		errorElement.textContent = message;
		errorElement.classList.remove('hidden');
		fields.forEach((field) => {
			field.classList.add('border-rose-500', 'ring-2', 'ring-rose-500');
			field.setAttribute('aria-invalid', 'true');
		});
		if (name === 'new_patient' || name === 'has_insurance') {
			updateCoverageFieldsetErrorState();
		}
	};

	const clearError = (name) => {
		const fields = getFieldElements(name);
		const errorElement = document.getElementById(`error-${name}`);
		if (!errorElement) return;
		errorElement.textContent = '';
		errorElement.classList.add('hidden');
		fields.forEach((field) => {
			field.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500');
			field.removeAttribute('aria-invalid');
		});
		if (name === 'new_patient' || name === 'has_insurance') {
			updateCoverageFieldsetErrorState();
		}
	};

	const requiredMessageByField = {
		first_name: 'El nombre debe contener solo letras y tener al menos 2 caracteres',
		last_name: 'El apellido debe contener solo letras y tener al menos 2 caracteres',
		date_of_birth: 'Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años',
		email: 'Ingresa un correo electrónico válido (ejemplo: nombre@proveedor.com)',
		phone: 'El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)',
		preferred_language: 'Selecciona tu idioma preferido',
		preferred_clinic: 'Selecciona la clínica que te gustaría visitar',
		preferred_date: 'Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante',
		preferred_time: 'Selecciona tu franja horaria preferida',
		service_type: 'Selecciona el tipo de atención que estás buscando',
		new_patient: 'Indica si esta es tu primera visita a HealthCore',
		has_insurance: 'Indica si tienes seguro médico',
		insurance_provider: 'Ingresa el nombre de tu aseguradora',
		insurance_member_id: 'El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos',
		health_concern: 'Describe tu consulta médica en al menos 20 caracteres (faltan 20 caracteres)',
		contact_consent: 'Debes dar tu consentimiento para ser contactado antes de enviar este formulario'
	};

	const validateRequiredPresence = () => {
		let isValid = true;
		const visitedRadioGroups = new Set();

		form.querySelectorAll('[required]').forEach((field) => {
			if (field.disabled) return;

			if (field.type === 'radio') {
				if (visitedRadioGroups.has(field.name)) return;
				visitedRadioGroups.add(field.name);
				const selected = form.querySelector(`input[name="${field.name}"]:checked`);
				if (!selected) {
					showError(field.name, requiredMessageByField[field.name] || 'Este campo es obligatorio');
					isValid = false;
				}
				return;
			}

			if (field.type === 'checkbox') {
				if (!field.checked) {
					showError(field.name, requiredMessageByField[field.name] || 'Este campo es obligatorio');
					isValid = false;
				}
				return;
			}

			if (field.value.trim() === '') {
				showError(field.name, requiredMessageByField[field.name] || 'Este campo es obligatorio');
				isValid = false;
			}
		});

		return isValid;
	};

	const clearAllErrors = () => {
		fieldIds.forEach((id) => clearError(id));
		if (globalError) {
			globalError.textContent = '';
			globalError.classList.add('hidden');
		}
	};

	const parseDateInput = (value) => {
		if (!value) return null;
		const [year, month, day] = value.split('-').map(Number);
		if (!year || !month || !day) return null;
		return new Date(year, month - 1, day);
	};

	const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const getAge = (birthDate) => {
		const today = startOfDay(new Date());
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age -= 1;
		}
		return age;
	};

	const getNextBusinessDay = (fromDate) => {
		const date = startOfDay(fromDate);
		do {
			date.setDate(date.getDate() + 1);
		} while (date.getDay() === 0 || date.getDay() === 6);
		return date;
	};

	const validateFirstName = () => {
		const value = getField('first_name').value.trim();
		if (!nameRegex.test(value)) {
			showError('first_name', 'El nombre debe contener solo letras y tener al menos 2 caracteres');
			return false;
		}
		clearError('first_name');
		return true;
	};

	const validateLastName = () => {
		const value = getField('last_name').value.trim();
		if (!nameRegex.test(value)) {
			showError('last_name', 'El apellido debe contener solo letras y tener al menos 2 caracteres');
			return false;
		}
		clearError('last_name');
		return true;
	};

	const validateDateOfBirth = () => {
		const dob = parseDateInput(getField('date_of_birth').value);
		if (!dob) {
			showError('date_of_birth', 'Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años');
			return false;
		}

		const today = startOfDay(new Date());
		const age = getAge(dob);
		if (dob > today || age < 0 || age > 120) {
			showError('date_of_birth', 'Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años');
			return false;
		}

		clearError('date_of_birth');
		return true;
	};

	const validateEmail = () => {
		const email = getField('email');
		const value = email.value.trim();
		const emailOk = value.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && email.checkValidity();
		if (!emailOk) {
			showError('email', 'Ingresa un correo electrónico válido (ejemplo: nombre@proveedor.com)');
			return false;
		}
		clearError('email');
		return true;
	};

	const validatePhone = () => {
		const value = getField('phone').value.trim();
		if (!phoneRegex.test(value)) {
			showError('phone', 'El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)');
			return false;
		}
		clearError('phone');
		return true;
	};

	const validatePreferredLanguage = () => {
		const value = getField('preferred_language').value;
		if (!value) {
			showError('preferred_language', 'Selecciona tu idioma preferido');
			return false;
		}
		clearError('preferred_language');
		return true;
	};

	const validatePreferredClinic = () => {
		const value = getField('preferred_clinic').value;
		if (!value) {
			showError('preferred_clinic', 'Selecciona la clínica que te gustaría visitar');
			return false;
		}
		clearError('preferred_clinic');
		return true;
	};

	const validatePreferredDate = () => {
		const value = getField('preferred_date').value;
		const date = parseDateInput(value);
		if (!date) {
			showError('preferred_date', 'Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante');
			return false;
		}

		const today = startOfDay(new Date());
		const nextBusinessDay = getNextBusinessDay(today);
		const maxDate = startOfDay(new Date(today));
		maxDate.setDate(maxDate.getDate() + 60);

		if (date < nextBusinessDay || date > maxDate) {
			showError('preferred_date', 'Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante');
			return false;
		}

		clearError('preferred_date');
		return true;
	};

	const validatePreferredTime = () => {
		const value = getField('preferred_time').value;
		if (!value) {
			showError('preferred_time', 'Selecciona tu franja horaria preferida');
			return false;
		}
		clearError('preferred_time');
		return true;
	};

	const validateServiceType = () => {
		const service = getField('service_type').value;
		if (!service) {
			showError('service_type', 'Selecciona el tipo de atención que estás buscando');
			return false;
		}

		if (service === 'Paediatric Care') {
			const dob = parseDateInput(getField('date_of_birth').value);
			if (!dob || getAge(dob) >= 18) {
				showError(
					'service_type',
					  'Paediatric Care está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o selecciona un servicio diferente.'
				);
				return false;
			}
		}

		clearError('service_type');
		return true;
	};

	const getRadioValue = (name) => {
		const selected = form.querySelector(`input[name="${name}"]:checked`);
		return selected ? selected.value : '';
	};

	const validateNewPatient = () => {
		const value = getRadioValue('new_patient');
		if (!value) {
			showError('new_patient', 'Indica si esta es tu primera visita a HealthCore');
			return false;
		}
		clearError('new_patient');
		return true;
	};

	const validateHasInsurance = () => {
		const value = getRadioValue('has_insurance');
		if (!value) {
			showError('has_insurance', 'Indica si tienes seguro médico');
			return false;
		}
		clearError('has_insurance');
		return true;
	};

	const validateInsuranceProvider = () => {
		const hasInsurance = getRadioValue('has_insurance') === 'Yes';
		const field = getField('insurance_provider');
		const value = field.value.trim();
		field.required = hasInsurance;

		if (hasInsurance && value.length === 0) {
			showError('insurance_provider', 'Ingresa el nombre de tu aseguradora');
			return false;
		}

		if (value.length > 100) {
			showError('insurance_provider', 'Ingresa el nombre de tu aseguradora');
			return false;
		}

		clearError('insurance_provider');
		return true;
	};

	const validateInsuranceMemberId = () => {
		const hasInsurance = getRadioValue('has_insurance') === 'Yes';
		const field = getField('insurance_member_id');
		const value = field.value.trim();
		field.required = hasInsurance;

		if (hasInsurance && !insuranceMemberRegex.test(value)) {
			showError('insurance_member_id', 'El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos');
			return false;
		}

		if (!hasInsurance && value.length > 0 && !insuranceMemberRegex.test(value)) {
			showError('insurance_member_id', 'El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos');
			return false;
		}

		clearError('insurance_member_id');
		return true;
	};

	const validatePatientId = () => {
		const newPatient = getRadioValue('new_patient');
		const value = getField('patient_id').value.trim();
		if (newPatient === 'No' && value.length > 0 && !patientIdRegex.test(value)) {
			showError('patient_id', 'El Patient ID debe seguir el formato HC- seguido de 6 caracteres alfanuméricos');
			return false;
		}
		clearError('patient_id');
		return true;
	};

	const updateConcernCounter = () => {
		const text = getField('health_concern').value;
		concernCounter.textContent = `${text.length}/500 caracteres`;
	};

	const validateHealthConcern = () => {
		const value = getField('health_concern').value.trim();
		updateConcernCounter();

		if (value.length < 20) {
			const missing = 20 - value.length;
			showError('health_concern', `Describe tu consulta médica en al menos 20 caracteres (faltan ${missing} caracteres)`);
			return false;
		}

		if (value.length > 500) {
			showError('health_concern', 'Describe tu consulta médica en al menos 20 caracteres (faltan 0 caracteres)');
			return false;
		}

		clearError('health_concern');
		return true;
	};

	const validateConsent = () => {
		const checked = getField('contact_consent').checked;
		if (!checked) {
			showError('contact_consent', 'Debes dar tu consentimiento para ser contactado antes de enviar este formulario');
			return false;
		}
		clearError('contact_consent');
		return true;
	};

	const updatePatientIdVisibility = () => {
		const isReturningPatient = getRadioValue('new_patient') === 'No';
		patientIdWrapper.classList.toggle('hidden', !isReturningPatient);
		if (!isReturningPatient) {
			getField('patient_id').value = '';
			clearError('patient_id');
		}
	};

	const updateInsuranceState = () => {
		const hasInsurance = getRadioValue('has_insurance') === 'Yes';
		const provider = getField('insurance_provider');
		const memberId = getField('insurance_member_id');

		provider.disabled = !hasInsurance;
		memberId.disabled = !hasInsurance;

		if (!hasInsurance) {
			provider.value = '';
			memberId.value = '';
			clearError('insurance_provider');
			clearError('insurance_member_id');
		}
	};

	const validatePreferredCombinationWarning = () => {
		const preferredTime = getField('preferred_time').value;
		const clinic = getField('preferred_clinic').value;

		if (preferredTime === 'Evening (5pm–8pm)' && lowEveningAvailabilityClinics.has(clinic)) {
			warningPreferredCombination.textContent =
				'Advertencia: la combinación de clínica y horario Evening puede tener disponibilidad limitada. Recepción confirmará una hora cercana.';
			warningPreferredCombination.classList.remove('hidden');
			return;
		}

		warningPreferredCombination.textContent = '';
		warningPreferredCombination.classList.add('hidden');
	};

	const validateAll = () => {
		const validations = [
			validateFirstName(),
			validateLastName(),
			validateDateOfBirth(),
			validateEmail(),
			validatePhone(),
			validatePreferredLanguage(),
			validatePreferredClinic(),
			validatePreferredDate(),
			validatePreferredTime(),
			validateServiceType(),
			validateNewPatient(),
			validateHasInsurance(),
			validateInsuranceProvider(),
			validateInsuranceMemberId(),
			validatePatientId(),
			validateHealthConcern(),
			validateConsent()
		];
		return validations.every(Boolean);
	};

	const bindFieldValidation = () => {
		getField('first_name').addEventListener('input', validateFirstName);
		getField('last_name').addEventListener('input', validateLastName);
		getField('date_of_birth').addEventListener('change', () => {
			validateDateOfBirth();
			validateServiceType();
		});
		getField('email').addEventListener('input', validateEmail);
		getField('phone').addEventListener('input', validatePhone);
		getField('preferred_language').addEventListener('change', validatePreferredLanguage);
		getField('preferred_clinic').addEventListener('change', () => {
			validatePreferredClinic();
			validatePreferredCombinationWarning();
		});
		getField('preferred_date').addEventListener('change', validatePreferredDate);
		getField('preferred_time').addEventListener('change', () => {
			validatePreferredTime();
			validatePreferredCombinationWarning();
		});
		getField('service_type').addEventListener('change', validateServiceType);
		getField('health_concern').addEventListener('input', validateHealthConcern);
		getField('contact_consent').addEventListener('change', validateConsent);

		form.querySelectorAll('input[name="new_patient"]').forEach((radio) => {
			radio.addEventListener('change', () => {
				updatePatientIdVisibility();
				validateNewPatient();
			});
		});

		form.querySelectorAll('input[name="has_insurance"]').forEach((radio) => {
			radio.addEventListener('change', () => {
				updateInsuranceState();
				validateHasInsurance();
			});
		});

		getField('insurance_provider').addEventListener('input', validateInsuranceProvider);
		getField('insurance_member_id').addEventListener('input', validateInsuranceMemberId);
		getField('patient_id').addEventListener('input', validatePatientId);

		form.querySelectorAll('input, select, textarea').forEach((field) => {
			field.addEventListener('blur', () => {
				const name = field.name;
				const validatorMap = {
					first_name: validateFirstName,
					last_name: validateLastName,
					date_of_birth: validateDateOfBirth,
					email: validateEmail,
					phone: validatePhone,
					preferred_language: validatePreferredLanguage,
					preferred_clinic: validatePreferredClinic,
					preferred_date: validatePreferredDate,
					preferred_time: validatePreferredTime,
					service_type: validateServiceType,
					insurance_provider: validateInsuranceProvider,
					insurance_member_id: validateInsuranceMemberId,
					patient_id: validatePatientId,
					health_concern: validateHealthConcern,
					contact_consent: validateConsent
				};
				if (validatorMap[name]) validatorMap[name]();
			});
		});
	};

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		clearAllErrors();
		updatePatientIdVisibility();
		updateInsuranceState();
		validatePreferredCombinationWarning();

		const requiredValid = validateRequiredPresence();
		const valid = requiredValid && validateAll();
		if (!valid) {
			if (globalError) {
				globalError.textContent = 'Corrige los errores del formulario antes de enviarlo.';
				globalError.classList.remove('hidden');
			}
			const firstInvalid = form.querySelector('[aria-invalid="true"]');
			if (firstInvalid) firstInvalid.focus();
			successMessage.classList.add('hidden');
			successMessage.textContent = '';
			return;
		}

		successMessage.innerHTML =
			'<strong>Formulario enviado con éxito.</strong><br><br><strong>Gracias por contactar a HealthCore.</strong><br><br>Hemos recibido tu consulta. Un miembro de nuestro equipo de recepción se pondrá en contacto contigo dentro de 1 día hábil para confirmar los detalles de tu cita y responder cualquier pregunta.<br><br>Si necesitas asistencia urgente, llama directamente a tu clínica preferida usando los números listados en nuestro sitio web.<br><br>Esperamos poder atenderte pronto.';
		successMessage.classList.remove('hidden');
		successMessage.setAttribute('tabindex', '-1');
		successMessage.focus();
		successMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });

		form.reset();
		updateConcernCounter();
		updatePatientIdVisibility();
		updateInsuranceState();
		warningPreferredCombination.classList.add('hidden');
		warningPreferredCombination.textContent = '';
	});

	const clearButton = document.getElementById('clear-form');
	if (clearButton) {
		clearButton.addEventListener('click', () => {
			clearAllErrors();
			successMessage.classList.add('hidden');
			successMessage.textContent = '';
			warningPreferredCombination.classList.add('hidden');
			warningPreferredCombination.textContent = '';
			setTimeout(() => {
				updateConcernCounter();
				updatePatientIdVisibility();
				updateInsuranceState();
			}, 0);
		});
	}

	updateConcernCounter();
	updatePatientIdVisibility();
	updateInsuranceState();
	updateCoverageFieldsetErrorState();
	bindFieldValidation();
}
