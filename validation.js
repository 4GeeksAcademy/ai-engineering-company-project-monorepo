const form = document.getElementById("application-form");
const formAlert = document.getElementById("form-alert");

if (form) {
	const textPattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/;
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
	const phonePattern = /^\+?[0-9\s()-]{8,20}$/;

	const fieldConfig = {
		firstName: {
			validate: (value) => {
				const clean = value.trim();
				if (!clean) return "El nombre es obligatorio.";
				if (clean.length < 2) return "El nombre debe tener al menos 2 caracteres.";
				if (!textPattern.test(clean)) return "El nombre solo puede contener letras y espacios.";
				return "";
			}
		},
		lastName: {
			validate: (value) => {
				const clean = value.trim();
				if (!clean) return "El apellido es obligatorio.";
				if (clean.length < 2) return "El apellido debe tener al menos 2 caracteres.";
				if (!textPattern.test(clean)) return "El apellido solo puede contener letras y espacios.";
				return "";
			}
		},
		email: {
			validate: (value) => {
				const clean = value.trim();
				if (!clean) return "El correo electrónico es obligatorio.";
				if (!emailPattern.test(clean)) return "Ingresa un correo electrónico válido.";
				return "";
			}
		},
		phone: {
			validate: (value) => {
				const clean = value.trim();
				if (!clean) return "El teléfono es obligatorio.";
				if (!phonePattern.test(clean)) return "Ingresa un teléfono válido con prefijo si aplica.";
				return "";
			}
		},
		country: {
			validate: (value) => (value ? "" : "Debes seleccionar tu país de residencia.")
		},
		city: {
			validate: (value) => {
				const clean = value.trim();
				if (!clean) return "La ciudad es obligatoria.";
				if (clean.length < 2) return "La ciudad debe tener al menos 2 caracteres.";
				return "";
			}
		},
		relationshipType: {
			validate: (value) => (value ? "" : "Selecciona cómo quieres vincularte con Brasaland.")
		},
		areaInterest: {
			validate: (value) => (value ? "" : "Selecciona un área de interés.")
		},
		contactMethod: {
			validate: (value) => (value ? "" : "Selecciona tu canal preferido de contacto.")
		},
		availabilityDate: {
			validate: (value) => {
				if (!value) return "Indica una fecha de disponibilidad.";
				const selected = new Date(value + "T00:00:00");
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				if (selected < today) return "La fecha no puede ser anterior a hoy.";
				return "";
			}
		},
		message: {
			validate: (value) => {
				const clean = value.trim();
				if (!clean) return "Describe tu propuesta o interés.";
				if (clean.length < 30) return "Tu mensaje debe tener al menos 30 caracteres.";
				if (clean.length > 600) return "Tu mensaje no puede superar 600 caracteres.";
				return "";
			}
		},
		privacyConsent: {
			validate: (value) => (value ? "" : "Debes aceptar el tratamiento de datos.")
		},
		followupConsent: {
			validate: (value) => (value ? "" : "Debes autorizar el contacto de seguimiento.")
		}
	};

	function setFieldError(fieldId, message) {
		const field = document.getElementById(fieldId);
		const errorNode = document.getElementById(`${fieldId}-error`);
		if (!field || !errorNode) return;

		errorNode.textContent = message;
		if (message) {
			field.setAttribute("aria-invalid", "true");
			field.setAttribute("aria-describedby", `${fieldId}-error`);
			field.classList.add("border-red-500", "ring-2", "ring-red-200");
		} else {
			field.removeAttribute("aria-invalid");
			field.removeAttribute("aria-describedby");
			field.classList.remove("border-red-500", "ring-2", "ring-red-200");
		}
	}

	function setRadioError(message) {
		const errorNode = document.getElementById("market-error");
		const radioButtons = form.querySelectorAll('input[name="market"]');
		if (!errorNode) return;

		errorNode.textContent = message;
		radioButtons.forEach((radio) => {
			if (message) {
				radio.setAttribute("aria-invalid", "true");
			} else {
				radio.removeAttribute("aria-invalid");
			}
		});
	}

	function getFieldValue(fieldId) {
		const field = document.getElementById(fieldId);
		if (!field) return "";

		if (field.type === "checkbox") {
			return field.checked;
		}

		return field.value;
	}

	function validateField(fieldId) {
		const config = fieldConfig[fieldId];
		if (!config) return "";

		const value = getFieldValue(fieldId);
		const message = config.validate(value);
		setFieldError(fieldId, message);
		return message;
	}

	function validateMarket() {
		const selected = form.querySelector('input[name="market"]:checked');
		const message = selected ? "" : "Selecciona el mercado de interés.";
		setRadioError(message);
		return message;
	}

	function setAlert(type, message) {
		formAlert.classList.remove("hidden", "border-red-300", "bg-red-50", "text-red-700", "border-green-300", "bg-green-50", "text-green-700");
		if (type === "error") {
			formAlert.classList.add("border-red-300", "bg-red-50", "text-red-700");
		} else {
			formAlert.classList.add("border-green-300", "bg-green-50", "text-green-700");
		}
		formAlert.textContent = message;
	}

	function validateForm() {
		let firstInvalid = null;
		let hasErrors = false;

		Object.keys(fieldConfig).forEach((fieldId) => {
			const error = validateField(fieldId);
			if (error && !firstInvalid) {
				firstInvalid = document.getElementById(fieldId);
			}
			if (error) {
				hasErrors = true;
			}
		});

		const marketError = validateMarket();
		if (marketError) {
			hasErrors = true;
			if (!firstInvalid) {
				firstInvalid = form.querySelector('input[name="market"]');
			}
		}

		return { hasErrors, firstInvalid };
	}

	Object.keys(fieldConfig).forEach((fieldId) => {
		const field = document.getElementById(fieldId);
		if (!field) return;

		const eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input";
		field.addEventListener(eventName, () => {
			validateField(fieldId);
			if (!formAlert.classList.contains("hidden")) {
				formAlert.classList.add("hidden");
			}
		});
	});

	const marketRadios = form.querySelectorAll('input[name="market"]');
	marketRadios.forEach((radio) => {
		radio.addEventListener("change", () => {
			validateMarket();
			if (!formAlert.classList.contains("hidden")) {
				formAlert.classList.add("hidden");
			}
		});
	});

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const { hasErrors, firstInvalid } = validateForm();

		if (hasErrors) {
			setAlert("error", "Revisa los campos marcados. Hay información pendiente o inválida.");
			if (firstInvalid) firstInvalid.focus();
			return;
		}

		setAlert("success", "Aplicación enviada correctamente. El equipo de Brasaland te contactará pronto.");
		form.reset();
	});
}
