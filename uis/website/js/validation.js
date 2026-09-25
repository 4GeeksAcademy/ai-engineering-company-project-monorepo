(() => {
  const form = document.querySelector("#appointment-form");
  if (!form) return;
  const $ = (name) => form.elements[name];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const format = (key, replacement) => window.HealthCoreI18n.get(key).replace("X", replacement);
  const errorMessages = {
    first_name: () => window.HealthCoreI18n.get("errors.first_name") || "First name must contain only letters and be at least 2 characters",
    last_name: () => window.HealthCoreI18n.get("errors.last_name") || "Last name must contain only letters and be at least 2 characters",
    date_of_birth: () => window.HealthCoreI18n.get("errors.date_of_birth") || "Enter a valid date of birth. Patient must be between 0 and 120 years old",
    email: () => window.HealthCoreI18n.get("errors.email") || "Enter a valid email address (example: name@provider.com)",
    phone: () => window.HealthCoreI18n.get("errors.phone") || "Phone must include a country code (example: +1 305 555 0191)",
    preferred_language: () => window.HealthCoreI18n.get("errors.language") || "Select your preferred language",
    preferred_clinic: () => window.HealthCoreI18n.get("errors.clinic") || "Select the clinic you would like to visit",
    preferred_date: () => window.HealthCoreI18n.get("errors.date") || "Select a date at least 1 business day from today and no more than 60 days ahead",
    preferred_time: () => window.HealthCoreI18n.get("errors.time") || "Select your preferred time of day",
    service_type: () => window.HealthCoreI18n.get("errors.service") || "Select the type of care you are looking for",
    new_patient: () => window.HealthCoreI18n.get("errors.new_patient") || "Please indicate whether this is your first visit to HealthCore",
    has_insurance: () => window.HealthCoreI18n.get("errors.insurance") || "Please indicate whether you have health insurance",
    insurance_provider: () => window.HealthCoreI18n.get("errors.provider") || "Please enter your insurance provider name",
    insurance_member_id: () => window.HealthCoreI18n.get("errors.member") || "Member ID must be between 6 and 20 alphanumeric characters",
    patient_id: () => window.HealthCoreI18n.get("errors.patient_id") || "Patient ID must be HC- followed by 6 alphanumeric characters",
    contact_consent: () => window.HealthCoreI18n.get("errors.consent") || "You must consent to being contacted before submitting this form"
  };
  const setError = (name, message) => { const target = form.querySelector(`[data-error-for="${name}"]`); const field = form.elements[name]; if (target) target.textContent = message || ""; if (field && field.type !== "radio" && field.type !== "checkbox") field.classList.toggle("invalid", Boolean(message)); };
  const value = (name) => { const field = form.elements[name]; if (!field) return ""; if (field instanceof RadioNodeList) return form.querySelector(`[name="${name}"]:checked`)?.value || ""; return field.value.trim(); };
  const age = (date) => { const birth = new Date(`${date}T00:00:00`); let years = today.getFullYear() - birth.getFullYear(); const month = today.getMonth() - birth.getMonth(); if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) years--; return years; };
  const parseDate = (date) => new Date(`${date}T00:00:00`);
  const validBusinessDate = (date) => { const selected = parseDate(date); const limit = new Date(today); limit.setDate(limit.getDate() + 60); if (selected <= today || selected > limit) return false; let days = 0; const cursor = new Date(today); while (cursor < selected) { cursor.setDate(cursor.getDate() + 1); if (cursor.getDay() !== 0 && cursor.getDay() !== 6) days++; } return days >= 1; };
  function validate() {
    const errors = {};
    const namePattern = /^[\p{L} ]{2,50}$/u;
    if (!namePattern.test(value("first_name"))) errors.first_name = errorMessages.first_name();
    if (!namePattern.test(value("last_name"))) errors.last_name = errorMessages.last_name();
    const dob = value("date_of_birth"); if (!dob || age(dob) < 0 || age(dob) > 120) errors.date_of_birth = errorMessages.date_of_birth();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) errors.email = errorMessages.email();
    if (!/^\+\d[\d\s().-]{6,}$/.test(value("phone"))) errors.phone = errorMessages.phone();
    ["preferred_language", "preferred_clinic"].forEach((name) => { if (!value(name)) errors[name] = errorMessages[name](); });
    if (!validBusinessDate(value("preferred_date"))) errors.preferred_date = errorMessages.preferred_date();
    ["preferred_time", "service_type", "new_patient", "has_insurance"].forEach((name) => { if (!value(name)) errors[name] = errorMessages[name](); });
    if (value("service_type") === "paediatric" && (!dob || age(dob) >= 18)) errors.service_type = window.HealthCoreI18n.get("errors.paediatric") || "Paediatric Care is available for patients under 18. Please check the date of birth or select a different service.";
    if (value("new_patient") === "no" && value("patient_id") && !/^HC-[A-Za-z0-9]{6}$/.test(value("patient_id"))) errors.patient_id = errorMessages.patient_id();
    if (value("has_insurance") === "yes") { if (!value("insurance_provider") || value("insurance_provider").length > 100) errors.insurance_provider = errorMessages.insurance_provider(); if (!/^[A-Za-z0-9]{6,20}$/.test(value("insurance_member_id"))) errors.insurance_member_id = errorMessages.insurance_member_id(); }
    const concern = value("health_concern"); if (concern.length < 20) errors.health_concern = format("errors.concern", 20 - concern.length);
    if (!$("contact_consent").checked) errors.contact_consent = errorMessages.contact_consent();
    Object.keys(errorMessages).concat("health_concern").forEach((name) => setError(name, errors[name] || ""));
    return errors;
  }
  function syncConditional() { document.querySelector("#patient-id-field").classList.toggle("visible", value("new_patient") === "no"); document.querySelector("#insurance-fields").classList.toggle("visible", value("has_insurance") === "yes"); }
  function syncDates() { const dob = $("date_of_birth"); const appointment = $("preferred_date"); const maxDob = new Date(today); maxDob.setFullYear(maxDob.getFullYear() - 120); dob.max = today.toISOString().slice(0, 10); dob.min = maxDob.toISOString().slice(0, 10); const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 60); appointment.min = today.toISOString().slice(0, 10); appointment.max = maxDate.toISOString().slice(0, 10); }
  function updateCounter() { const count = value("health_concern").length; document.querySelector("#concern-counter").textContent = `${count} / 500`; }
  function updateWarning() { const warning = document.querySelector("#time-warning"); const clinic = value("preferred_clinic"); const time = value("preferred_time"); const limited = { "HealthCore San Antonio": "warning.san_antonio", "HealthCore Austin North": "warning.austin_north" }; warning.textContent = time === "evening" && limited[clinic] ? window.HealthCoreI18n.get(limited[clinic]) : ""; }
  form.addEventListener("input", () => { syncConditional(); updateCounter(); updateWarning(); }); form.addEventListener("change", () => { syncConditional(); updateWarning(); }); form.addEventListener("submit", (event) => { event.preventDefault(); const errors = validate(); if (Object.keys(errors).length) { const first = form.querySelector(".invalid, [data-error-for]:not(:empty)"); first?.scrollIntoView({ behavior: "smooth", block: "center" }); return; } form.querySelector("#success-message").hidden = false; form.querySelector("#success-message").focus(); form.querySelector(".button-submit").disabled = true; });
  document.addEventListener("healthcore:language", () => { updateCounter(); updateWarning(); });
  syncDates(); syncConditional(); updateCounter();
})();
