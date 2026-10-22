// Pruebas sin dependencias: usa DOM mínimo para ejercitar las reglas puras del script.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(new URL("./validation.js", `file://${__filename}`), "utf8");

const errors = {
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

function makeClassList() {
  const values = new Set();
  return {
    add(...tokens) { tokens.forEach((token) => values.add(token)); },
    remove(...tokens) { tokens.forEach((token) => values.delete(token)); },
    toggle(token, force) {
      const enabled = force === undefined ? !values.has(token) : force;
      if (enabled) values.add(token); else values.delete(token);
      return enabled;
    },
    contains(token) { return values.has(token); },
  };
}

class Element {
  constructor(id, value = "") {
    this.id = id;
    this.value = value;
    this.checked = false;
    this.textContent = "";
    this.innerHTML = "";
    this.dataset = {};
    this.attributes = {};
    this.classList = makeClassList();
    this.listeners = {};
    this.children = [];
  }
  addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); }
  fire(type, event = {}) { (this.listeners[type] ?? []).forEach((fn) => fn({preventDefault() {}, ...event})); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  focus() { this.focused = true; }
}

const ids = [
  "full-name", "email", "phone", "country", "experience", "sector", "english-level",
  "availability-immediate", "availability-one-month", "availability-two-three-months", "availability-exploring",
  "linkedin", "comments", "data-policy", "comments-counter", "form-status",
  "full-name-error", "email-error", "phone-error", "country-error", "experience-error", "sector-error",
  "english-level-error", "availability-error", "linkedin-error", "comments-error", "data-policy-error",
];
const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
const radioIds = ids.filter((id) => id.startsWith("availability-"));
const form = new Element("talent-registration");
form.reset = () => {
  ["full-name", "email", "phone", "country", "experience", "sector", "english-level", "linkedin", "comments"].forEach((id) => { elements[id].value = ""; });
  [...radioIds, "data-policy"].forEach((id) => { elements[id].checked = false; });
};
form.querySelector = (selector) => {
  if (selector === '[aria-invalid="true"]') {
    return ["full-name", "email", "phone", "country", "experience", "sector", "english-level", ...radioIds, "linkedin", "comments", "data-policy"]
      .map((id) => elements[id]).find((element) => element.getAttribute("aria-invalid") === "true") ?? null;
  }
  return elements[selector.slice(1)] ?? null;
};
form.querySelectorAll = (selector) => selector === 'input[name="availability"]' ? radioIds.map((id) => elements[id]) : [];
form.listeners = {};
const document = {querySelector: (selector) => selector === "#talent-registration" ? form : null};
const sandbox = {document, URL, window: {setTimeout: (fn) => fn()}};
vm.runInNewContext(source, sandbox, {filename: "validation.js"});

function check(key, expected, label) {
  const actual = elements[`${key === "fullName" ? "full-name" : key === "experience" ? "experience" : key === "englishLevel" ? "english-level" : key}`];
  actual?.fire(["country", "sector", "englishLevel"].includes(key) ? "change" : "blur");
  const errorId = `${key === "fullName" ? "full-name" : key === "experience" ? "experience" : key === "englishLevel" ? "english-level" : key}-error`;
  assert.equal(elements[errorId].textContent, expected, label);
}

try {
  elements["full-name"].value = "   María   López  ";
  check("fullName", "", "trimmed two-part name accepted");
  elements["full-name"].value = "María";
  check("fullName", errors.fullName, "single name rejected");

  elements.email.value = "candidate@example.org";
  check("email", "", "valid email accepted");
  elements.email.value = "candidate@localhost";
  check("email", errors.email, "email without valid domain rejected");

  elements.phone.value = "+34 612 345 678";
  check("phone", "", "international phone accepted");
  elements.phone.value = "612 345 678";
  check("phone", errors.phone, "phone without country prefix rejected");

  for (const [id, value, key, expected] of [
    ["country", "", "country", errors.country],
    ["country", "spain", "country", ""],
    ["experience", "", "experience", errors.experience],
    ["experience", "51", "experience", errors.experience],
    ["experience", "0", "experience", ""],
    ["sector", "", "sector", errors.sector],
    ["english-level", "", "englishLevel", errors.englishLevel],
  ]) {
    elements[id].value = value;
    check(key, expected, `${key} value ${JSON.stringify(value)}`);
  }

  radioIds.forEach((id) => { elements[id].checked = false; });
  form.fire("submit");
  assert.equal(elements["availability-error"].textContent, errors.availability, "missing availability rejected");
  elements["availability-one-month"].checked = true;
  elements["availability-one-month"].fire("change");
  assert.equal(elements["availability-error"].textContent, "", "selected availability accepted");

  elements.linkedin.value = "linkedin.com/profile";
  check("linkedin", errors.linkedin, "URL missing protocol rejected");
  elements.linkedin.value = "https://example.org/profile";
  check("linkedin", "", "well-formed HTTPS URL accepted without domain restriction");
  elements.linkedin.value = "";
  check("linkedin", "", "empty optional URL accepted");

  elements.comments.value = "x".repeat(500);
  elements.comments.fire("input");
  assert.equal(elements["comments-counter"].textContent, "500/500 caracteres", "counter at limit");
  elements.comments.value = "x".repeat(501);
  elements.comments.fire("input");
  elements.comments.fire("blur");
  assert.equal(elements["comments-counter"].textContent, "501/500 caracteres", "counter over limit");
  assert.equal(elements["comments-error"].textContent, "Los comentarios no pueden exceder 500 caracteres (quedan 0)", "over-limit comment error uses remaining count");

  elements["data-policy"].checked = false;
  elements["data-policy"].fire("change");
  assert.equal(elements["data-policy-error"].textContent, errors.dataPolicy, "missing consent rejected");
  elements["data-policy"].checked = true;
  elements["data-policy"].fire("change");
  assert.equal(elements["data-policy-error"].textContent, "", "accepted consent clears error");

  form.fire("submit");
  assert.equal(elements["full-name"].getAttribute("aria-invalid"), "true", "empty submit marks invalid fields");
  assert.equal(elements["full-name"].focused, true, "invalid submit focuses first invalid control");

  elements["full-name"].value = "Ada Lovelace";
  elements.email.value = "ada@example.com";
  elements.phone.value = "+1 305 555 0100";
  elements.country.value = "united-states";
  elements.experience.value = "10";
  elements.sector.value = "technology";
  elements["english-level"].value = "advanced";
  elements["availability-immediate"].checked = true;
  elements.linkedin.value = "";
  elements.comments.value = "Perfil de prueba";
  elements["data-policy"].checked = true;
  form.fire("submit");
  assert.equal(elements["form-status"].classList.contains("hidden"), false, "valid form shows simulated success");
  assert.match(elements["form-status"].textContent + elements["form-status"].innerHTML, /simulación académica/i, "success states clearly that this is a simulation");
  assert.equal(elements["form-status"].focused, true, "success message receives focus");
  elements["country"].value = "other";
  elements["country"].fire("change");
  assert.equal(elements["form-status"].classList.contains("hidden"), true, "editing a select hides prior success");
  form.fire("submit");
  assert.equal(elements["form-status"].classList.contains("hidden"), false, "valid form can show success again");

  elements.comments.value = "texto";
  elements["comments-error"].textContent = "error previo";
  elements["comments-counter"].textContent = "texto previo";
  form.reset();
  form.fire("reset");
  assert.equal(elements.comments.value, "", "reset clears comments");
  assert.equal(elements["comments-error"].textContent, "", "reset clears errors");
  assert.equal(elements["comments-counter"].textContent, "0/500 caracteres", "reset resets counter");
  assert.equal(elements["form-status"].classList.contains("hidden"), true, "reset hides previous success");
  assert.equal(elements["full-name"].getAttribute("aria-invalid"), null, "reset removes invalid state");

  console.log("PASS: all JavaScript validation scenarios in the no-dependency harness");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
