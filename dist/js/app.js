(() => {
  const form = document.querySelector("#patientForm");
  if (!form) return;

  const fields = [...form.querySelectorAll("[data-validate]")];
  const status = document.querySelector("#formStatus");
  const successBanner = document.querySelector("#successBanner");
  const i18n = window.HealthCoreI18n;

  function getErrorKey(field) {
    const value = field.value.trim();
    switch (field.name) {
      case "fullName":
        return value.length >= 2 ? "" : "err_name";
      case "email":
        return value && !field.validity.typeMismatch ? "" : "err_email";
      case "phone": {
        const digits = value.replace(/\D/g, "");
        return /^[+()0-9 .-]+$/.test(value) && digits.length >= 7 ? "" : "err_phone";
      }
      case "clinic":
        return value ? "" : "err_clinic";
      case "enquiryType":
        return value ? "" : "err_enquiry_type";
      case "message":
        return value.length >= 10 ? "" : "err_message";
      default:
        return "";
    }
  }

  function validateField(field) {
    const error = document.querySelector(`#err-${field.id}`);
    const key = getErrorKey(field);
    error.classList.toggle("hidden", !key);
    error.textContent = key ? i18n.t(key) : "";

    if (key) {
      error.dataset.i18n = key;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", error.id);
      field.classList.add("border-red-500");
    } else {
      error.removeAttribute("data-i18n");
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      field.classList.remove("border-red-500");
    }

    return !key;
  }

  function setStatus(key) {
    status.dataset.i18n = key;
    status.textContent = i18n.t(key);
    status.classList.remove("hidden");
  }

  fields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.hasAttribute("aria-invalid")) validateField(field);
    });
    field.addEventListener("change", () => {
      if (field.hasAttribute("aria-invalid")) validateField(field);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalidField = fields.find((field) => !validateField(field));
    if (invalidField) {
      setStatus("err_summary");
      invalidField.focus();
      return;
    }

    status.classList.add("hidden");
    status.removeAttribute("data-i18n");
    successBanner.classList.remove("hidden");
    successBanner.focus();
  });

  document.querySelector("#clearBtn")?.addEventListener("click", () => {
    form.reset();
    fields.forEach((field) => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      field.classList.remove("border-red-500");
      const error = document.querySelector(`#err-${field.id}`);
      error.textContent = "";
      error.removeAttribute("data-i18n");
      error.classList.add("hidden");
    });
    status.classList.add("hidden");
    status.removeAttribute("data-i18n");
    successBanner.classList.add("hidden");
  });
})();
