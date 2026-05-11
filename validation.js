const form = document.getElementById("application-form");
const alertBox = document.getElementById("form-alert");

if (form && alertBox) {
  const fieldValidators = {
    fullName: [
      {
        test: (value) => value.trim().length > 0,
        message: "El nombre completo es obligatorio."
      },
      {
        test: (value) => value.trim().length >= 3,
        message: "El nombre completo debe tener al menos 3 caracteres."
      },
      {
        test: (value) => /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/.test(value.trim()),
        message: "El nombre solo puede contener letras y espacios."
      }
    ],
    workEmail: [
      {
        test: (value) => value.trim().length > 0,
        message: "El email es obligatorio."
      },
      {
        test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        message: "Introduce un email válido, por ejemplo nombre@empresa.com."
      }
    ],
    phone: [
      {
        test: (value) => value.trim() === "" || /^[+]?[(]?[0-9\s\-().]{8,20}$/.test(value.trim()),
        message: "El teléfono debe tener entre 8 y 20 caracteres válidos o quedar vacío."
      }
    ],
    companyName: [
      {
        test: (value) => value.trim() === "" || value.trim().length >= 2,
        message: "Si indicas una empresa, debe tener al menos 2 caracteres."
      }
    ],
    subject: [
      {
        test: (value) => value.trim().length > 0,
        message: "El asunto es obligatorio."
      },
      {
        test: (value) => value.trim().length >= 4,
        message: "El asunto debe tener al menos 4 caracteres."
      },
      {
        test: (value) => value.trim().length <= 120,
        message: "El asunto no puede superar los 120 caracteres."
      }
    ],
    message: [
      {
        test: (value) => value.trim().length > 0,
        message: "El mensaje es obligatorio."
      },
      {
        test: (value) => value.trim().length >= 20,
        message: "El mensaje debe tener al menos 20 caracteres."
      },
      {
        test: (value) => value.trim().length <= 1200,
        message: "El mensaje no puede superar los 1200 caracteres."
      }
    ]
  };

  function setAlert(success, message) {
    alertBox.textContent = message;
    alertBox.className = "mb-6 rounded-lg border px-4 py-3 text-sm font-semibold";
    alertBox.classList.remove("hidden");

    if (success) {
      alertBox.classList.add("border-emerald-400", "bg-emerald-100", "text-emerald-900");
      return;
    }

    alertBox.classList.add("border-red-400", "bg-red-100", "text-red-900");
  }

  function setFieldError(fieldName, message) {
    const field = form.elements[fieldName];
    const errorEl = document.getElementById(`${fieldName}-error`);

    if (!field || !errorEl) {
      return;
    }

    const hasError = Boolean(message);
    field.setAttribute("aria-invalid", String(hasError));
    field.classList.toggle("border-red-600", hasError);
    field.classList.toggle("focus:border-red-600", hasError);
    field.classList.toggle("focus:ring-red-200", hasError);

    errorEl.textContent = message || "";
    errorEl.className = "mt-2 hidden rounded-md border px-3 py-2 text-sm font-semibold";
    errorEl.classList.toggle("hidden", !hasError);
    if (hasError) {
      errorEl.classList.add("border-red-300", "bg-red-50", "text-red-800");
    }
  }

  function validateField(fieldName) {
    const field = form.elements[fieldName];
    const rules = fieldValidators[fieldName];

    if (!field || !rules) {
      return true;
    }

    const value = field.value;
    for (const rule of rules) {
      if (!rule.test(value)) {
        setFieldError(fieldName, rule.message);
        return false;
      }
    }

    setFieldError(fieldName, "");
    return true;
  }

  function clearFormFeedback() {
    Object.keys(fieldValidators).forEach((fieldName) => {
      setFieldError(fieldName, "");
    });
    alertBox.classList.add("hidden");
  }

  const fieldNames = Object.keys(fieldValidators);

  fieldNames.forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (!field) {
      return;
    }

    field.addEventListener("input", () => {
      validateField(fieldName);
    });

    field.addEventListener("blur", () => {
      validateField(fieldName);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const isValid = fieldNames.every((fieldName) => validateField(fieldName));
    if (!isValid) {
      setAlert(false, "No se pudo enviar el formulario. Revisa los campos con error.");
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    setAlert(true, "Formulario enviado correctamente. Hemos simulado el envío con éxito.");
    form.reset();
  });

  form.addEventListener("reset", () => {
    clearFormFeedback();
  });
}