const form = document.querySelector("#talent-form");

if (form) {
  const successMessage = document.querySelector("#success-message");
  const commentsField = document.querySelector("#comments");
  const commentsCounter = document.querySelector("#comments-counter");

  const getText = (key, params) => {
    if (window.NEXOVA_I18N && typeof window.NEXOVA_I18N.t === "function") {
      return window.NEXOVA_I18N.t(`validation.${key}`, params);
    }

    const fallback = {
      fullName: "El nombre debe contener al menos nombre y apellido",
      email: "Ingresa un email válido (ejemplo: nombre@empresa.com)",
      phone: "El teléfono debe incluir código de país (ejemplo: +34 612 345 678)",
      country: "Selecciona tu país de residencia",
      experience: "Los años de experiencia deben estar entre 0 y 50",
      sector: "Selecciona el sector de tu interés",
      englishLevel: "Indica tu nivel de inglés",
      availability: "Selecciona tu disponibilidad",
      linkedin: "Si incluyes LinkedIn, debe ser una URL válida",
      commentsLimit: "Los comentarios no pueden exceder 500 caracteres (quedan {remaining})",
      commentsCounter: "{remaining} caracteres disponibles",
      dataPolicy: "Debes aceptar la política de tratamiento de datos para continuar"
    };

    const template = fallback[key] || key;
    if (!params) {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, token) => {
      if (params[token] === undefined || params[token] === null) {
        return `{${token}}`;
      }
      return String(params[token]);
    });
  };

  const fieldConfig = {
    fullName: {
      errorId: "fullName-error",
      messageKey: "fullName",
      validate: (value) => value.trim().split(/\s+/).filter(Boolean).length >= 2
    },
    email: {
      errorId: "email-error",
      messageKey: "email",
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    },
    phone: {
      errorId: "phone-error",
      messageKey: "phone",
      validate: (value) => /^\+\d[\d\s()-]{6,}$/.test(value.trim())
    },
    country: {
      errorId: "country-error",
      messageKey: "country",
      validate: (value) => value !== ""
    },
    experience: {
      errorId: "experience-error",
      messageKey: "experience",
      validate: (value) => {
        const number = Number(value);
        return value !== "" && Number.isFinite(number) && number >= 0 && number <= 50;
      }
    },
    sector: {
      errorId: "sector-error",
      messageKey: "sector",
      validate: (value) => value !== ""
    },
    englishLevel: {
      errorId: "englishLevel-error",
      messageKey: "englishLevel",
      validate: (value) => value !== ""
    },
    linkedin: {
      errorId: "linkedin-error",
      messageKey: "linkedin",
      validate: (value) => value.trim() === "" || /^https?:\/\/.+/i.test(value.trim())
    },
    dataPolicy: {
      errorId: "dataPolicy-error",
      messageKey: "dataPolicy",
      validate: (_, element) => element.checked
    }
  };

  const availabilityError = document.querySelector("#availability-error");
  const availabilityInputs = Array.from(form.querySelectorAll('input[name="availability"]'));

  const setError = (element, errorId, message) => {
    const errorElement = document.querySelector(`#${errorId}`);
    if (!errorElement) {
      return;
    }

    errorElement.textContent = message;

    if (element instanceof NodeList || Array.isArray(element)) {
      element.forEach((input) => {
        input.setAttribute("aria-invalid", message ? "true" : "false");
      });
      return;
    }

    element.setAttribute("aria-invalid", message ? "true" : "false");
  };

  const validateAvailability = () => {
    const checked = availabilityInputs.some((input) => input.checked);
    availabilityError.textContent = checked ? "" : getText("availability");
    availabilityInputs.forEach((input) => {
      input.setAttribute("aria-invalid", checked ? "false" : "true");
    });
    return checked;
  };

  const updateCommentsCounter = () => {
    const remaining = 500 - commentsField.value.length;
    commentsCounter.textContent = getText("commentsCounter", { remaining });
  };

  const validateComments = () => {
    const remaining = 500 - commentsField.value.length;
    const isValid = commentsField.value.length <= 500;
    const message = isValid ? "" : getText("commentsLimit", { remaining });
    setError(commentsField, "comments-error", message);
    return isValid;
  };

  const validateField = (name) => {
    const element = form.elements.namedItem(name);
    const config = fieldConfig[name];
    if (!element || !config) {
      return true;
    }

    const value = element.type === "checkbox" ? element.checked : element.value;
    const isValid = config.validate(value, element);
    setError(element, config.errorId, isValid ? "" : getText(config.messageKey));
    return isValid;
  };

  const clearAllErrors = () => {
    Object.keys(fieldConfig).forEach((name) => {
      const element = form.elements.namedItem(name);
      const config = fieldConfig[name];
      if (!element || !config) {
        return;
      }
      setError(element, config.errorId, "");
    });

    availabilityError.textContent = "";
    availabilityInputs.forEach((input) => {
      input.setAttribute("aria-invalid", "false");
    });
    setError(commentsField, "comments-error", "");
  };

  Object.keys(fieldConfig).forEach((name) => {
    const element = form.elements.namedItem(name);
    if (!element) {
      return;
    }

    const eventName = element.type === "checkbox" || element.tagName === "SELECT" ? "change" : "input";
    element.addEventListener(eventName, () => {
      validateField(name);
    });

    if (eventName !== "change") {
      element.addEventListener("blur", () => {
        validateField(name);
      });
    }
  });

  availabilityInputs.forEach((input) => {
    input.addEventListener("change", validateAvailability);
  });

  commentsField.addEventListener("input", () => {
    updateCommentsCounter();
    validateComments();
  });

  commentsField.addEventListener("blur", validateComments);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const validityChecks = [
      validateField("fullName"),
      validateField("email"),
      validateField("phone"),
      validateField("country"),
      validateField("experience"),
      validateField("sector"),
      validateField("englishLevel"),
      validateField("linkedin"),
      validateField("dataPolicy"),
      validateAvailability(),
      validateComments()
    ];

    const firstInvalid = form.querySelector('[aria-invalid="true"]');

    if (validityChecks.every(Boolean)) {
      form.classList.add("hidden");
      successMessage.classList.remove("hidden");
      successMessage.focus();
      form.reset();
      updateCommentsCounter();
      return;
    }

    if (firstInvalid) {
      firstInvalid.focus();
    }
  });

  form.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      clearAllErrors();
      if (successMessage) {
        successMessage.classList.add("hidden");
      }
      form.classList.remove("hidden");
      updateCommentsCounter();
    });
  });

  window.addEventListener("nexova:langchange", () => {
    updateCommentsCounter();

    Object.keys(fieldConfig).forEach((name) => {
      const element = form.elements.namedItem(name);
      const config = fieldConfig[name];
      if (!element || !config) {
        return;
      }

      if (element.getAttribute("aria-invalid") === "true") {
        setError(element, config.errorId, getText(config.messageKey));
      }
    });

    if (availabilityInputs.some((input) => input.getAttribute("aria-invalid") === "true")) {
      availabilityError.textContent = getText("availability");
    }

    if (commentsField.getAttribute("aria-invalid") === "true") {
      const remaining = 500 - commentsField.value.length;
      setError(commentsField, "comments-error", getText("commentsLimit", { remaining }));
    }
  });

  updateCommentsCounter();
}