document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("applicationForm");
	if (!form) return;

	const fields = {
		fullName: document.getElementById("fullName"),
		company: document.getElementById("company"),
		email: document.getElementById("email"),
		phone: document.getElementById("phone"),
		city: document.getElementById("city"),
		country: document.getElementById("country"),
		serviceLine: document.getElementById("serviceLine"),
		teamSize: document.getElementById("teamSize"),
		industry: document.getElementById("industry"),
		timeline: document.getElementById("timeline"),
		message: document.getElementById("message"),
		privacy: document.getElementById("privacy"),
		consent: document.getElementById("consent"),
	};

	const statusBox = document.getElementById("formStatus");
	const errorSummary = document.getElementById("errorSummary");

	const validators = {
		fullName: (value) => {
			if (!value.trim()) return "El nombre completo es obligatorio.";
			if (value.trim().length < 3) return "El nombre debe tener al menos 3 caracteres.";
			return "";
		},
		company: (value) => {
			if (!value.trim()) return "El nombre de la empresa es obligatorio.";
			return "";
		},
		email: (value) => {
			if (!value.trim()) return "El email corporativo es obligatorio.";
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
			if (!emailRegex.test(value.trim())) return "Introduce un email valido.";
			return "";
		},
		phone: (value) => {
			if (!value.trim()) return "El telefono es obligatorio.";
			const phoneRegex = /^\+?[0-9\s()\-]{7,20}$/;
			if (!phoneRegex.test(value.trim())) return "Introduce un telefono valido (7 a 20 digitos).";
			return "";
		},
		city: (value) => {
			if (!value.trim()) return "La ciudad es obligatoria.";
			return "";
		},
		country: (value) => {
			if (!value.trim()) return "El pais es obligatorio.";
			return "";
		},
		serviceLine: (value) => {
			if (!value) return "Selecciona un servicio de interes.";
			return "";
		},
		teamSize: (value) => {
			if (!value) return "Selecciona el tamano aproximado del equipo.";
			return "";
		},
		industry: (value) => {
			if (!value) return "Selecciona el sector principal.";
			return "";
		},
		timeline: (value) => {
			if (!value) return "Selecciona el plazo para iniciar.";
			return "";
		},
		message: (value) => {
			const normalized = value.trim();
			if (!normalized) return "Describe tu necesidad de talento.";
			if (normalized.length < 80) return "La descripcion debe tener al menos 80 caracteres.";
			return "";
		},
		privacy: (checked) => (!checked ? "Debes aceptar la politica de privacidad." : ""),
		consent: (checked) => (!checked ? "Debes autorizar el contacto para seguimiento comercial." : ""),
	};

	function setFieldError(fieldName, message) {
		const errorEl = document.getElementById(`${fieldName}Error`);
		const fieldEl = fields[fieldName];
		if (!errorEl || !fieldEl) return;
		errorEl.textContent = message;
		fieldEl.setAttribute("aria-invalid", message ? "true" : "false");
		if (message) {
			fieldEl.classList.add("border-red-400");
			fieldEl.classList.remove("border-slate-600");
		} else {
			fieldEl.classList.remove("border-red-400");
			fieldEl.classList.add("border-slate-600");
		}
	}

	function getChallengeError() {
		const selected = form.querySelectorAll('input[name="challenges"]:checked').length;
		return selected > 0 ? "" : "Selecciona al menos un reto prioritario.";
	}

	function validateField(fieldName) {
		const fieldEl = fields[fieldName];
		if (!fieldEl || !validators[fieldName]) return "";
		const isCheckbox = fieldEl.type === "checkbox";
		const value = isCheckbox ? fieldEl.checked : fieldEl.value;
		const error = validators[fieldName](value);
		setFieldError(fieldName, error);
		return error;
	}

	function clearGlobalMessages() {
		statusBox.textContent = "";
		statusBox.className = "mb-6 hidden rounded-md border px-4 py-3 text-sm";
		errorSummary.textContent = "";
		errorSummary.classList.add("hidden");
	}

	function showErrorSummary(messages) {
		errorSummary.textContent = `Revisa los siguientes campos: ${messages.join(" ")}`;
		errorSummary.classList.remove("hidden");
	}

	function showSuccessMessage() {
		statusBox.textContent = "Solicitud enviada correctamente. En este entorno no hay backend conectado, pero tus datos pasaron todas las validaciones.";
		statusBox.className =
			"mb-6 rounded-md border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100";
	}

	function validateAll() {
		clearGlobalMessages();

		const errors = [];
		Object.keys(validators).forEach((name) => {
			const error = validateField(name);
			if (error) errors.push(error);
		});

		const challengesError = getChallengeError();
		const challengesErrorEl = document.getElementById("challengesError");
		if (challengesErrorEl) challengesErrorEl.textContent = challengesError;
		if (challengesError) errors.push(challengesError);

		return errors;
	}

	[
		"fullName",
		"company",
		"email",
		"phone",
		"city",
		"country",
		"serviceLine",
		"teamSize",
		"industry",
		"timeline",
		"message",
		"privacy",
		"consent",
	].forEach((name) => {
		const field = fields[name];
		if (!field) return;
		const eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "blur";
		field.addEventListener(eventName, () => {
			clearGlobalMessages();
			validateField(name);
		});
	});

	form.querySelectorAll('input[name="challenges"]').forEach((checkbox) => {
		checkbox.addEventListener("change", () => {
			clearGlobalMessages();
			const challengesErrorEl = document.getElementById("challengesError");
			if (challengesErrorEl) challengesErrorEl.textContent = getChallengeError();
		});
	});

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const errors = validateAll();

		if (errors.length > 0) {
			showErrorSummary(errors);
			const firstInvalid = form.querySelector('[aria-invalid="true"]');
			if (firstInvalid) firstInvalid.focus();
			return;
		}

		showSuccessMessage();
		form.reset();
		Object.keys(fields).forEach((name) => setFieldError(name, ""));
		const challengesErrorEl = document.getElementById("challengesError");
		if (challengesErrorEl) challengesErrorEl.textContent = "";
	});
});
