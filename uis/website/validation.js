// Validación académica del formulario. No envía ni almacena datos.
const form = document.querySelector("#talent-registration");

if (form) {
  const fullName = form.querySelector("#full-name");
  const email = form.querySelector("#email");
  const phone = form.querySelector("#phone");
  const country = form.querySelector("#country");
  const experience = form.querySelector("#experience");
  const sector = form.querySelector("#sector");
  const englishLevel = form.querySelector("#english-level");
  const availabilityRadios = [...form.querySelectorAll('input[name="availability"]')];
  const linkedin = form.querySelector("#linkedin");
  const comments = form.querySelector("#comments");
  const dataPolicy = form.querySelector("#data-policy");
  const commentsCounter = form.querySelector("#comments-counter");
  const statusMessage = form.querySelector("#form-status");

  const errorMessages = {
    fullName: "El nombre debe contener al menos nombre y apellido",
    email: "Ingresa un email válido (ejemplo: nombre@empresa.com)",
    phone: "El teléfono debe incluir código de país (ejemplo: +34 612 345 678)",
    country: "Selecciona tu país de residencia",
    experience: "Los años de experiencia deben estar entre 0 y 50",
    sector: "Selecciona el sector de tu interés",
    englishLevel: "Indica tu nivel de inglés",
    availability: "Selecciona tu disponibilidad",
    linkedin: "Si incluyes LinkedIn, debe ser una URL válida",
    dataPolicy: "Debes aceptar la política de tratamiento de datos para continuar",
  };

  const errorElements = {
    fullName: form.querySelector("#full-name-error"),
    email: form.querySelector("#email-error"),
    phone: form.querySelector("#phone-error"),
    country: form.querySelector("#country-error"),
    experience: form.querySelector("#experience-error"),
    sector: form.querySelector("#sector-error"),
    englishLevel: form.querySelector("#english-level-error"),
    availability: form.querySelector("#availability-error"),
    linkedin: form.querySelector("#linkedin-error"),
    comments: form.querySelector("#comments-error"),
    dataPolicy: form.querySelector("#data-policy-error"),
  };

  // Cada campo se valida por separado para mostrar un mensaje claro y predecible.
  function validateFullName() {
    const words = fullName.value.trim().split(/\s+/).filter(Boolean);
    return words.length >= 2 ? "" : errorMessages.fullName;
  }

  function validateEmail() {
    const value = email.value.trim();
    const emailPattern = /^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
    return emailPattern.test(value) ? "" : errorMessages.email;
  }

  function validatePhone() {
    const value = phone.value.trim();
    const phonePattern = /^\+[1-9]\d{0,2}(?:[ .-]?\d){7,14}$/;
    return phonePattern.test(value) ? "" : errorMessages.phone;
  }

  function validateCountry() {
    return country.value ? "" : errorMessages.country;
  }

  function validateExperience() {
    const value = experience.value.trim();
    const number = Number(value);
    return value !== "" && Number.isInteger(number) && number >= 0 && number <= 50
      ? ""
      : errorMessages.experience;
  }

  function validateSector() {
    return sector.value ? "" : errorMessages.sector;
  }

  function validateEnglishLevel() {
    return englishLevel.value ? "" : errorMessages.englishLevel;
  }

  function validateAvailability() {
    return availabilityRadios.some((radio) => radio.checked)
      ? ""
      : errorMessages.availability;
  }

  function validateLinkedIn() {
    const value = linkedin.value.trim();
    if (!value) return "";

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:"
        ? ""
        : errorMessages.linkedin;
    } catch {
      return errorMessages.linkedin;
    }
  }

  function validateComments() {
    const length = comments.value.length;
    const remaining = Math.max(0, 500 - length);
    return length > 500
      ? `Los comentarios no pueden exceder 500 caracteres (quedan ${remaining})`
      : "";
  }

  function validateDataPolicy() {
    return dataPolicy.checked ? "" : errorMessages.dataPolicy;
  }

  // Aplica el mismo estado visual y accesible a campos simples y al grupo radio.
  function setFieldError(key, message, controls) {
    const errorElement = errorElements[key];
    if (!errorElement) return Boolean(message);

    errorElement.textContent = message;
    errorElement.classList.toggle("hidden", !message);

    controls.forEach((control) => {
      control.classList.toggle("border-red-600", Boolean(message));
      control.classList.toggle("focus-visible:border-red-700", Boolean(message));

      if (message) {
        control.setAttribute("aria-invalid", "true");
      } else {
        control.removeAttribute("aria-invalid");
      }
    });

    return Boolean(message);
  }

  function checkField(key) {
    const validators = {
      fullName: [validateFullName, [fullName]],
      email: [validateEmail, [email]],
      phone: [validatePhone, [phone]],
      country: [validateCountry, [country]],
      experience: [validateExperience, [experience]],
      sector: [validateSector, [sector]],
      englishLevel: [validateEnglishLevel, [englishLevel]],
      availability: [validateAvailability, availabilityRadios],
      linkedin: [validateLinkedIn, [linkedin]],
      comments: [validateComments, [comments]],
      dataPolicy: [validateDataPolicy, [dataPolicy]],
    };
    const [validate, controls] = validators[key];
    return setFieldError(key, validate(), controls);
  }

  function updateCommentsCounter() {
    const length = comments.value.length;
    const remaining = 500 - length;
    commentsCounter.textContent = `${length}/500 caracteres`;
    commentsCounter.classList.toggle("text-red-700", remaining < 0);
    commentsCounter.classList.toggle("text-slate-500", remaining >= 0);
  }

  function showSimulationSuccess() {
    statusMessage.innerHTML = "<strong class=\"block text-base font-semibold\">¡Gracias por tu interés en Nexova!</strong><span class=\"mt-2 block\">Esta es una simulación académica: tus datos no se han enviado ni recibido por un servidor y no se han almacenado.</span><span class=\"mt-2 block\">Nuestro equipo de selección la revisaría y te contactaría en caso de que tu perfil encajara con alguna de nuestras oportunidades actuales o futuras.</span><span class=\"mt-2 block\">Mientras tanto, síguenos en LinkedIn para estar al día de nuestras vacantes y contenido sobre desarrollo profesional.</span>";
    statusMessage.classList.remove("hidden");
    statusMessage.focus();
  }

  function hideSimulationSuccess() {
    statusMessage.classList.add("hidden");
  }

  function handleFieldChange(key) {
    hideSimulationSuccess();
    checkField(key);
  }

  const fieldEvents = [
    [fullName, "fullName"],
    [email, "email"],
    [phone, "phone"],
    [experience, "experience"],
    [linkedin, "linkedin"],
    [comments, "comments"],
  ];

  fieldEvents.forEach(([field, key]) => {
    field.addEventListener("input", () => {
      // Solo valida mientras el usuario ya haya salido del campo o exista un error.
      if (field.dataset.touched === "true" || field.getAttribute("aria-invalid") === "true") {
        handleFieldChange(key);
      } else {
        hideSimulationSuccess();
      }
      if (key === "comments") updateCommentsCounter();
    });
    field.addEventListener("blur", () => {
      field.dataset.touched = "true";
      handleFieldChange(key);
    });
  });

  [[country, "country"], [sector, "sector"], [englishLevel, "englishLevel"]].forEach(([field, key]) => {
    field.addEventListener("change", () => {
      field.dataset.touched = "true";
      handleFieldChange(key);
    });
  });

  availabilityRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      handleFieldChange("availability");
    });
  });

  dataPolicy.addEventListener("change", () => handleFieldChange("dataPolicy"));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hideSimulationSuccess();

    const fieldsInOrder = [
      "fullName", "email", "phone", "country", "experience", "sector",
      "englishLevel", "availability", "linkedin", "comments", "dataPolicy",
    ];
    const hasErrors = fieldsInOrder.map(checkField).some(Boolean);

    if (hasErrors) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    showSimulationSuccess();
  });

  form.addEventListener("reset", () => {
    // El evento reset se dispara antes de que el navegador vacíe los controles.
    window.setTimeout(() => {
      const controlsByKey = {
        fullName: [fullName],
        email: [email],
        phone: [phone],
        country: [country],
        experience: [experience],
        sector: [sector],
        englishLevel: [englishLevel],
        availability: availabilityRadios,
        linkedin: [linkedin],
        comments: [comments],
        dataPolicy: [dataPolicy],
      };

      Object.keys(errorElements).forEach((key) => {
        setFieldError(key, "", controlsByKey[key]);
      });
      [fullName, email, phone, country, experience, sector, englishLevel, ...availabilityRadios, linkedin, comments, dataPolicy].forEach((field) => {
        delete field.dataset.touched;
      });
      updateCommentsCounter();
      statusMessage.textContent = "";
      statusMessage.classList.add("hidden");
    }, 0);
  });

  updateCommentsCounter();
}
