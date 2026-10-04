const form = document.querySelector("#application-form");

if (form) {
  const status = document.querySelector("#form-status");
  const resumeInput = form.elements.resume;
  const maximumResumeBytes = 5 * 1024 * 1024;
  const allowedResumeExtensions = /\.(pdf|docx)$/i;
  const minimumContentLengths = { fullName: 2, role: 2, skills: 20 };

  function getErrorMessage(field) {
    if (field.name === "resume") {
      if (!field.files.length) return field.validity.valid ? "" : "This field is required.";
      const file = field.files[0];
      if (!allowedResumeExtensions.test(file.name)) return "Choose a PDF or DOCX file.";
      if (file.size > maximumResumeBytes) return "The file must be 5 MB or smaller.";
    }

    if (field.validity.valueMissing) return "This field is required.";

    const minimumContentLength = minimumContentLengths[field.name];
    if (minimumContentLength && field.value.trim().length < minimumContentLength) {
      return `Enter at least ${minimumContentLength} non-whitespace characters.`;
    }

    if (field.name === "phone" && (field.value.match(/\d/g) || []).length < 7) {
      return "Enter a phone number with at least 7 digits.";
    }

    if (field.validity.valid) return "";
    if (field.validity.typeMismatch) return "Enter a valid email address.";
    if (field.validity.patternMismatch) return "Enter a valid phone number, including country code if applicable.";
    if (field.validity.tooShort) return `Enter at least ${field.minLength} characters.`;
    if (field.validity.tooLong) return `Enter no more than ${field.maxLength} characters.`;
    if (field.validity.rangeUnderflow) return `Enter ${field.min} or more years.`;
    if (field.validity.rangeOverflow) return `Enter ${field.max} or fewer years.`;
    if (field.validity.stepMismatch) return "Enter a whole number of years.";
    return "Check this field and try again.";
  }

  function validateField(field) {
    const error = document.querySelector(`#${field.id}-error`);
    if (!error) return true;

    const message = getErrorMessage(field);
    error.textContent = message;
    const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));

    if (message) {
      field.setAttribute("aria-invalid", "true");
      describedBy.add(error.id);
      field.setAttribute("aria-describedby", [...describedBy].join(" "));
    } else {
      field.removeAttribute("aria-invalid");
      describedBy.delete(error.id);
      if (describedBy.size) field.setAttribute("aria-describedby", [...describedBy].join(" "));
      else field.removeAttribute("aria-describedby");
    }

    return !message;
  }

  form.addEventListener("input", (event) => {
    const field = event.target;
    if (field.matches("input, select, textarea")) validateField(field);
  });

  form.addEventListener("change", (event) => {
    const field = event.target;
    if (field.matches("input, select, textarea")) validateField(field);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = [...form.querySelectorAll("input, select, textarea")];
    const validFields = fields.map((field) => validateField(field));
    const firstInvalidField = fields[validFields.indexOf(false)];

    status.classList.remove("hidden", "bg-[#e3f0d1]", "text-[#294a24]", "bg-[#fbe9df]", "text-[#8c332b]");
    if (firstInvalidField) {
      status.classList.add("bg-[#fbe9df]", "text-[#8c332b]");
      status.textContent = "Please correct the highlighted fields before continuing.";
      firstInvalidField.focus();
      return;
    }

    status.classList.add("bg-[#e3f0d1]", "text-[#294a24]");
    status.textContent = "Your application passed local validation. This demo did not upload or save your information.";
    form.reset();
    fields.forEach((field) => {
      field.removeAttribute("aria-invalid");
      const error = document.querySelector(`#${field.id}-error`);
      if (error) error.textContent = "";
    });
  });

  resumeInput.addEventListener("change", () => validateField(resumeInput));
}