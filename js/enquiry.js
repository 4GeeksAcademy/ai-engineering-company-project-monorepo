(() => {
  const form = document.querySelector("#patient-enquiry-form");
  if (!form) return;

  const status = document.querySelector("#form-status");
  const successBanner = document.querySelector("#success-banner");
  const patientIdWrap = document.querySelector("#patient-id-wrap");
  const insuranceFields = document.querySelector("#insurance-fields");
  const healthConcern = form.elements.health_concern;
  const today = new Date();
  let language = "en";

  try {
    const savedLanguage = localStorage.getItem("hc_lang");
    if (savedLanguage === "en" || savedLanguage === "es") language = savedLanguage;
  } catch {}

  const messages = {
    en: {
      firstName: "First name must contain only letters and be at least 2 characters",
      lastName: "Last name must contain only letters and be at least 2 characters",
      dob: "Enter a valid date of birth. Patient must be between 0 and 120 years old",
      email: "Enter a valid email address (example: name@provider.com)",
      phone: "Phone must include a country code (example: +1 305 555 0191)",
      language: "Select your preferred language",
      clinic: "Select the clinic you would like to visit",
      date: "Select a date at least 1 business day from today and no more than 60 days ahead",
      time: "Select your preferred time of day",
      service: "Select the type of care you are looking for",
      paediatric: "Paediatric Care is available for patients under 18. Please check the date of birth or select a different service.",
      newPatient: "Please indicate whether this is your first visit to HealthCore",
      insuranceChoice: "Please indicate whether you have health insurance",
      insuranceProvider: "Please enter your insurance provider name",
      memberId: "Member ID must be between 6 and 20 alphanumeric characters",
      patientId: "Patient ID must be HC- followed by 6 alphanumeric characters",
      concern: (remaining) => `Please describe your health concern in at least 20 characters (${remaining} characters remaining)`,
      consent: "You must consent to being contacted before submitting this form",
      summary: "Please correct the highlighted fields before continuing.",
      limitedHours: "Evening availability may be limited because this clinic closes before 8pm. Our team will confirm.",
      counter: (remaining) => `${remaining} characters remaining`
    },
    es: {
      firstName: "El nombre debe contener solo letras y tener al menos 2 caracteres",
      lastName: "El apellido debe contener solo letras y tener al menos 2 caracteres",
      dob: "Introduce una fecha de nacimiento válida. La persona debe tener entre 0 y 120 años",
      email: "Introduce un correo electrónico válido (ejemplo: nombre@proveedor.com)",
      phone: "El teléfono debe incluir el código de país (ejemplo: +1 305 555 0191)",
      language: "Selecciona tu idioma preferido",
      clinic: "Selecciona la clínica que deseas visitar",
      date: "Selecciona una fecha al menos 1 día hábil desde hoy y dentro de los próximos 60 días",
      time: "Selecciona tu horario preferido",
      service: "Selecciona el tipo de atención que necesitas",
      paediatric: "La atención pediátrica es para menores de 18 años. Revisa la fecha de nacimiento o selecciona otro servicio.",
      newPatient: "Indica si esta es tu primera visita a HealthCore",
      insuranceChoice: "Indica si tienes seguro médico",
      insuranceProvider: "Introduce el nombre de tu aseguradora",
      memberId: "El número de afiliación debe tener entre 6 y 20 caracteres alfanuméricos",
      patientId: "El ID de paciente debe comenzar con HC- seguido de 6 caracteres alfanuméricos",
      concern: (remaining) => `Describe tu necesidad de atención en al menos 20 caracteres (${remaining} caracteres restantes)`,
      consent: "Debes aceptar que nos pongamos en contacto contigo para enviar este formulario",
      summary: "Corrige los campos resaltados antes de continuar.",
      limitedHours: "La disponibilidad por la tarde puede ser limitada porque esta clínica cierra antes de las 20:00. Nuestro equipo lo confirmará.",
      counter: (remaining) => `Quedan ${remaining} caracteres`
    }
  };

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function configureDateBounds() {
    const birthDate = form.elements.date_of_birth;
    const youngest = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    birthDate.min = localDateString(youngest);
    birthDate.max = localDateString(today);

    const nextBusinessDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    while (nextBusinessDay.getDay() === 0 || nextBusinessDay.getDay() === 6) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    const latestDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);
    form.elements.preferred_date.min = localDateString(nextBusinessDay);
    form.elements.preferred_date.max = localDateString(latestDate);
  }

  function getRadioValue(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function setConditionalFields() {
    const returning = getRadioValue("new_patient") === "no";
    const insured = getRadioValue("has_insurance") === "yes";
    patientIdWrap.hidden = !returning;
    insuranceFields.hidden = !insured;
    form.elements.insurance_provider.required = insured;
    form.elements.insurance_member_id.required = insured;
    if (!returning) clearFieldError(form.elements.patient_id);
    if (!insured) {
      clearFieldError(form.elements.insurance_provider);
      clearFieldError(form.elements.insurance_member_id);
    }
  }

  function ageOn(dateValue, atDate) {
    const birth = new Date(`${dateValue}T00:00:00`);
    let age = atDate.getFullYear() - birth.getFullYear();
    const beforeBirthday = atDate.getMonth() < birth.getMonth() ||
      (atDate.getMonth() === birth.getMonth() && atDate.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  function errorKey(field) {
    const value = field.value.trim();
    switch (field.name) {
      case "first_name":
      case "last_name":
        return /^\p{L}{2,50}$/u.test(value) ? "" : field.name === "first_name" ? "firstName" : "lastName";
      case "date_of_birth": {
        if (!value) return "dob";
        const age = ageOn(value, today);
        return age < 0 || age > 120 ? "dob" : "";
      }
      case "email":
        return value && field.validity.valid ? "" : "email";
      case "phone":
        return /^\+\d{1,3}(?:[ .()-]?\d){6,14}$/.test(value) ? "" : "phone";
      case "preferred_language":
        return value ? "" : "language";
      case "preferred_clinic":
        return value ? "" : "clinic";
      case "preferred_date":
        return value && value >= field.min && value <= field.max ? "" : "date";
      case "preferred_time":
        return value ? "" : "time";
      case "service_type":
        if (!value) return "service";
        if (value === "Paediatric Care" && (!form.elements.date_of_birth.value || ageOn(form.elements.date_of_birth.value, today) >= 18)) return "paediatric";
        return "";
      case "new_patient":
        return getRadioValue("new_patient") ? "" : "newPatient";
      case "has_insurance":
        return getRadioValue("has_insurance") ? "" : "insuranceChoice";
      case "insurance_provider":
        if (getRadioValue("has_insurance") !== "yes") return "";
        return value ? "" : "insuranceProvider";
      case "insurance_member_id":
        return getRadioValue("has_insurance") !== "yes" ? "" : /^[A-Za-z0-9]{6,20}$/.test(value) ? "" : "memberId";
      case "patient_id":
        return !value || /^HC-[A-Za-z0-9]{6}$/.test(value) ? "" : "patientId";
      case "health_concern":
        return value.length >= 20 && value.length <= 500 ? "" : "concern";
      case "contact_consent":
        return field.checked ? "" : "consent";
      default:
        return "";
    }
  }

  function errorMessage(key) {
    const message = messages[language][key];
    return key === "concern" ? message(Math.max(0, 20 - healthConcern.value.trim().length)) : message;
  }

  function validateField(field) {
    const error = document.querySelector(`#${field.name}-error`);
    if (!error) return true;
    const key = errorKey(field);
    error.textContent = key ? errorMessage(key) : "";
    error.hidden = !key;
    if (key) field.dataset.errorKey = key;
    else delete field.dataset.errorKey;
    if (key) {
      field.setAttribute("aria-invalid", "true");
      const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      describedBy.add(error.id);
      field.setAttribute("aria-describedby", [...describedBy].join(" "));
    } else {
      field.removeAttribute("aria-invalid");
      const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      describedBy.delete(error.id);
      if (describedBy.size) field.setAttribute("aria-describedby", [...describedBy].join(" "));
      else field.removeAttribute("aria-describedby");
    }
    return !key;
  }

  function validateGroup(name) {
    const proxy = { name, value: "" };
    const error = document.querySelector(`#${name}-error`);
    const key = errorKey(proxy);
    error.textContent = key ? errorMessage(key) : "";
    error.hidden = !key;
    if (key) error.dataset.errorKey = key;
    else delete error.dataset.errorKey;
    form.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
      if (key) {
        radio.setAttribute("aria-invalid", "true");
        radio.setAttribute("aria-describedby", error.id);
      } else {
        radio.removeAttribute("aria-invalid");
        radio.removeAttribute("aria-describedby");
      }
    });
    return !key;
  }

  function clearFieldError(field) {
    const error = document.querySelector(`#${field.name}-error`);
    if (error) {
      error.textContent = "";
      error.hidden = true;
      error.removeAttribute("data-error-key");
    }
    field.removeAttribute("aria-invalid");
    const errorId = error?.id;
    const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    if (errorId) describedBy.delete(errorId);
    if (describedBy.size) field.setAttribute("aria-describedby", [...describedBy].join(" "));
    else field.removeAttribute("aria-describedby");
    delete field.dataset.errorKey;
  }

  function updateTimeWarning() {
    const selectedClinic = form.elements.preferred_clinic.selectedOptions[0];
    const closes = Number(selectedClinic?.dataset.closeHour || 0);
    const warning = document.querySelector("#time-warning");
    const showWarning = form.elements.preferred_time.value === "evening" && closes > 17 && closes < 20;
    warning.textContent = showWarning ? messages[language].limitedHours : "";
    warning.hidden = !showWarning;
  }

  function applyLanguage(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language;
    document.title = language === "en" ? "Patient enquiry | HealthCore" : "Consulta de paciente | HealthCore";
    document.querySelectorAll("[data-en][data-es]").forEach((element) => {
      element.textContent = element.dataset[language];
    });
    document.querySelectorAll("[data-placeholder-en][data-placeholder-es]").forEach((element) => {
      element.placeholder = element.dataset[`placeholder${language === "en" ? "En" : "Es"}`];
    });
    const toggle = document.querySelector("#lang-toggle");
    toggle.textContent = language === "en" ? "ES" : "EN";
    toggle.setAttribute("aria-label", language === "en" ? "Cambiar a español" : "Switch to English");
    document.querySelectorAll("input[data-error-key], select[data-error-key], textarea[data-error-key]").forEach((field) => {
      const error = document.querySelector(`#${field.name}-error`);
      if (error && field.dataset.errorKey) error.textContent = errorMessage(field.dataset.errorKey);
    });
    document.querySelectorAll(".field-error[data-error-key]").forEach((error) => {
      error.textContent = errorMessage(error.dataset.errorKey);
    });
    if (!status.classList.contains("hidden") && status.dataset.errorKey) {
      status.textContent = messages[language][status.dataset.errorKey];
    }
    document.querySelector("#health-concern-counter").textContent = messages[language].counter(500 - healthConcern.value.length);
    updateTimeWarning();
    try {
      localStorage.setItem("hc_lang", language);
    } catch {}
  }

  configureDateBounds();
  setConditionalFields();
  applyLanguage(language);

  document.querySelector("#lang-toggle").addEventListener("click", () => {
    applyLanguage(language === "en" ? "es" : "en");
  });

  form.addEventListener("blur", (event) => {
    if (event.target.matches("input, select, textarea") && event.target.type !== "radio") validateField(event.target);
  }, true);

  form.addEventListener("input", (event) => {
    const field = event.target;
    if (field.name === "health_concern") {
      document.querySelector("#health-concern-counter").textContent = messages[language].counter(500 - field.value.length);
    }
    if (field.name === "date_of_birth" && form.elements.service_type.value === "Paediatric Care") validateField(form.elements.service_type);
    if (field.dataset.errorKey) validateField(field);
  });

  form.addEventListener("change", (event) => {
    const field = event.target;
    if (field.name === "new_patient" || field.name === "has_insurance") {
      setConditionalFields();
      validateGroup(field.name);
    }
    if (field.name === "preferred_time" || field.name === "preferred_clinic") updateTimeWarning();
    if (field.type === "radio") validateGroup(field.name);
    else if (field.matches("input, select, textarea")) validateField(field);
    if (field.name === "date_of_birth" && form.elements.service_type.value === "Paediatric Care") validateField(form.elements.service_type);
  });

  healthConcern.addEventListener("input", () => {
    if (healthConcern.dataset.errorKey) validateField(healthConcern);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setConditionalFields();
    const fields = [...form.querySelectorAll("input:not([type=radio]), select, textarea")].filter((field) => !field.closest("[hidden]") && !field.disabled);
    const validFields = fields.map(validateField);
    const groupNames = ["new_patient", "has_insurance"];
    const validGroups = groupNames.map(validateGroup);
    const firstInvalid = fields[validFields.indexOf(false)];

    if (firstInvalid || validGroups.includes(false)) {
      status.textContent = messages[language].summary;
      status.dataset.errorKey = "summary";
      status.className = "mt-6 rounded-xl bg-[#fbe9df] px-4 py-3 text-sm font-semibold text-[#8c332b]";
      (firstInvalid || form.querySelector('input[aria-invalid="true"]'))?.focus();
      return;
    }

    status.className = "hidden mt-6 rounded-xl px-4 py-3 text-sm font-semibold";
    status.removeAttribute("data-error-key");
    form.classList.add("hidden");
    successBanner.classList.remove("hidden");
    successBanner.focus();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      form.querySelectorAll("input, select, textarea").forEach((field) => clearFieldError(field));
      form.querySelectorAll(".field-error").forEach((error) => {
        error.textContent = "";
        error.hidden = true;
      });
      status.className = "hidden mt-6 rounded-xl px-4 py-3 text-sm font-semibold";
      status.removeAttribute("data-error-key");
      form.classList.remove("hidden");
      successBanner.classList.add("hidden");
      document.querySelector("#time-warning").hidden = true;
      document.querySelector("#health-concern-counter").textContent = messages[language].counter(500);
      setConditionalFields();
    });
  });
})();