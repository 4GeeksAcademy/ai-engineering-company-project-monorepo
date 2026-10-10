const form = document.getElementById("diagnosticForm");
const formMessage = document.getElementById("formMessage");

const fieldRules = {
  fullName: {
    validate: (value) => value.trim().length >= 3,
    message: "Ingresa nombre y apellido con al menos 3 caracteres.",
  },
  workEmail: {
    validate: (value) => {
      const email = value.trim().toLowerCase();
      const basicFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
      const blockedDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"];
      const domain = email.split("@")[1] || "";
      return basicFormat && !blockedDomains.includes(domain);
    },
    message: "Usa un email corporativo (evita dominios personales como gmail.com).",
  },
  phone: {
    validate: (value) => /^\+?[0-9\s()-]{9,20}$/.test(value.trim()),
    message: "Incluye un telefono valido con prefijo o numero de contacto completo.",
  },
  primaryOffice: {
    validate: (value) => value.trim() !== "",
    message: "Selecciona la sede principal del proyecto (Valencia, Miami u otra).",
  },
  companyName: {
    validate: (value) => value.trim().length >= 2,
    message: "Indica el nombre legal o comercial de tu empresa.",
  },
  industry: {
    validate: (value) => value.trim() !== "",
    message: "Selecciona el sector principal de tu empresa.",
  },
  employeeCount: {
    validate: (value) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 10 && n <= 10000;
    },
    message: "El numero de empleados debe estar entre 10 y 10000.",
  },
  country: {
    validate: (value) => value.trim().length >= 2,
    message: "Indica el pais donde opera principalmente tu empresa.",
  },
  priorityArea: {
    validate: (value) => value.trim() !== "",
    message: "Selecciona el area que quieres mejorar primero.",
  },
  currentPain: {
    validate: (value) => {
      const len = value.trim().length;
      return len >= 20 && len <= 500;
    },
    message: "Describe el problema con entre 20 y 500 caracteres.",
  },
  targetDate: {
    validate: (value) => {
      if (!value) return false;
      const selected = new Date(`${value}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    },
    message: "La fecha objetivo debe ser hoy o una fecha futura.",
  },
  budgetRange: {
    validate: (value) => value.trim() !== "",
    message: "Selecciona un rango de inversion estimado.",
  },
  currentSlaHours: {
    validate: (value) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 24 && n <= 168;
    },
    message: "Indica un SLA actual entre 24 y 168 horas.",
  },
};

const baseInputClasses = ["border-blue-300", "focus:border-blue-700", "focus:ring-blue-700/30"];
const errorInputClasses = ["border-rose-400", "focus:border-rose-400", "focus:ring-rose-400/40"];
const successInputClasses = ["border-emerald-400", "focus:border-emerald-400", "focus:ring-emerald-400/40"];

// Devuelve el elemento donde se mostrara el error asociado al input.
function getErrorElement(input) {
  return document.getElementById(`${input.id}Error`);
}

// Aplica estilos y atributos ARIA segun el estado del campo (error, exito o por defecto).
function setInputState(input, state, message = "") {
  const errorEl = getErrorElement(input);
  input.classList.remove(...baseInputClasses, ...errorInputClasses, ...successInputClasses);

  if (state === "error") {
    input.classList.add(...errorInputClasses);
    input.setAttribute("aria-invalid", "true");
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    return;
  }

  if (state === "success") {
    input.classList.add(...successInputClasses);
    input.setAttribute("aria-invalid", "false");
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    return;
  }

  input.classList.add(...baseInputClasses);
  input.removeAttribute("aria-invalid");
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

// Ejecuta la regla de validacion de un campo y actualiza su estado visual.
function validateField(input) {
  const rule = fieldRules[input.id];
  if (!rule) return true;

  const value = input.value;
  const isValid = rule.validate(value);

  if (!isValid) {
    setInputState(input, "error", rule.message);
    return false;
  }

  setInputState(input, "success");
  return true;
}

// Limpia el mensaje global del formulario y lo deja oculto.
function clearGlobalMessage() {
  formMessage.textContent = "";
  formMessage.className = "hidden rounded-md px-4 py-3 text-sm font-medium";
}

// Muestra un mensaje global de error o exito con el estilo correspondiente.
function showGlobalMessage(type, message) {
  const base = "rounded-md px-4 py-3 text-sm font-medium";
  if (type === "error") {
    formMessage.className = `${base} bg-rose-900/40 text-rose-200 border border-rose-400/60`;
  } else {
    formMessage.className = `${base} bg-emerald-900/40 text-emerald-200 border border-emerald-400/60`;
  }
  formMessage.textContent = message;
}

const allInputs = Object.keys(fieldRules)
  .map((id) => document.getElementById(id))
  .filter(Boolean);

allInputs.forEach((input) => {
  input.addEventListener("input", () => {
    validateField(input);
    clearGlobalMessage();
  });

  input.addEventListener("blur", () => {
    validateField(input);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const results = allInputs.map((input) => validateField(input));
  const isFormValid = results.every(Boolean);

  if (!isFormValid) {
    showGlobalMessage("error", "Revisa los campos marcados: hay datos pendientes o inconsistentes para poder enviar la solicitud.");
    const firstInvalid = allInputs.find((input) => input.getAttribute("aria-invalid") === "true");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  showGlobalMessage("success", "Solicitud enviada correctamente. El equipo de Nexova te contactara con una propuesta inicial en menos de 48 horas.");
});

form.addEventListener("reset", () => {
  clearGlobalMessage();
  allInputs.forEach((input) => setInputState(input, "default"));
});
