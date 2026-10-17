const form = document.getElementById("application-form");
const feedback = document.getElementById("form-feedback");
const resetButton = document.getElementById("clear-form");

const fields = [
  "customer_id",
  "name",
  "contact",
  "city",
  "loyalty_tier",
  "preferences",
  "reservation_id",
  "branch_id",
  "datetime",
  "party_size",
  "status"
];

function showError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (!input || !error) return;

  error.textContent = message;
  if (message) {
    input.classList.add("border-red-500", "ring-2", "ring-red-200");
    input.setAttribute("aria-invalid", "true");
  } else {
    input.classList.remove("border-red-500", "ring-2", "ring-red-200");
    input.removeAttribute("aria-invalid");
  }
}

function validateCustomerId(value) {
  if (!value) return "customer_id is required.";
  if (!/^CUST-\d{4,}$/.test(value)) {
    return "customer_id must look like CUST-0001.";
  }
  return "";
}

function validateReservationId(value) {
  if (!value) return "reservation_id is required.";
  if (!/^RES-\d{4,}$/.test(value)) {
    return "reservation_id must look like RES-1001.";
  }
  return "";
}

function validateName(value) {
  if (!value.trim()) return "name is required.";
  if (value.trim().length < 3) return "name must have at least 3 characters.";
  return "";
}

function validateContact(value) {
  if (!value) return "contact is required.";
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!isEmail) return "contact must be a valid email address.";
  return "";
}

function validateCity(value) {
  if (!value.trim()) return "city is required.";
  if (value.trim().length < 2) return "city must have at least 2 characters.";
  return "";
}

function validateSelect(fieldId, value) {
  if (!value) return `${fieldId} is required.`;
  return "";
}

function validatePreferences(value) {
  if (!value.trim()) return "preferences is required.";
  if (value.trim().length < 10) {
    return "preferences must have at least 10 characters.";
  }
  return "";
}

function validateDatetime(value) {
  if (!value) return "datetime is required.";
  const selectedDate = new Date(value);
  if (Number.isNaN(selectedDate.getTime())) {
    return "datetime must be a valid date and time.";
  }
  if (selectedDate.getTime() < Date.now()) {
    return "datetime must be in the future.";
  }
  return "";
}

function validatePartySize(value) {
  if (!value) return "party_size is required.";
  const size = Number(value);
  if (!Number.isInteger(size)) return "party_size must be a whole number.";
  if (size < 1 || size > 20) return "party_size must be between 1 and 20.";
  return "";
}

function getValidationMessage(fieldId, value) {
  switch (fieldId) {
    case "customer_id":
      return validateCustomerId(value);
    case "name":
      return validateName(value);
    case "contact":
      return validateContact(value);
    case "city":
      return validateCity(value);
    case "loyalty_tier":
    case "branch_id":
    case "status":
      return validateSelect(fieldId, value);
    case "preferences":
      return validatePreferences(value);
    case "reservation_id":
      return validateReservationId(value);
    case "datetime":
      return validateDatetime(value);
    case "party_size":
      return validatePartySize(value);
    default:
      return "";
  }
}

function validateField(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return true;

  const message = getValidationMessage(fieldId, input.value);
  showError(fieldId, message);
  return message === "";
}

function validateAllFields() {
  let isValid = true;
  fields.forEach((fieldId) => {
    const ok = validateField(fieldId);
    if (!ok) isValid = false;
  });
  return isValid;
}

fields.forEach((fieldId) => {
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.addEventListener("blur", () => validateField(fieldId));
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true") {
      validateField(fieldId);
    }
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  feedback.classList.add("hidden");
  feedback.textContent = "";

  const isValid = validateAllFields();
  if (!isValid) {
    feedback.classList.remove("hidden", "border-green-300", "bg-green-50", "text-green-800");
    feedback.classList.add("border-red-300", "bg-red-50", "text-red-800");
    feedback.textContent = "Please fix the highlighted fields before submitting.";
    return;
  }

  feedback.classList.remove("hidden", "border-red-300", "bg-red-50", "text-red-800");
  feedback.classList.add("border-green-300", "bg-green-50", "text-green-800");
  feedback.textContent = "Application submitted successfully. Submission is simulated for Milestone 1.";
  form.reset();

  fields.forEach((fieldId) => showError(fieldId, ""));
});

resetButton.addEventListener("click", () => {
  feedback.classList.add("hidden");
  feedback.textContent = "";
  fields.forEach((fieldId) => showError(fieldId, ""));
});
