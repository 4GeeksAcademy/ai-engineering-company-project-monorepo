// End-to-end check of the sign-up page (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with an active admin, and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=admin@example.com E2E_PASSWORD=... npm run e2e:register
// It creates one pending user with a unique email on every run (no reset needed).
// Covers: client validation, POST /users with the optional profile, the automatic login (pending account ->
// 401 -> "pending approval" notice; active account -> token stored and redirect), 409 and 422 from the API.
import { chromium } from "playwright";
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const API = process.env.E2E_API_URL ?? "http://localhost:8000";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active admin of the API (see the header of this file).");
  process.exit(2);
}
const loginResponse = await fetch(`${API}/auth/login`, { method: "POST", body: new URLSearchParams({ username: EMAIL, password: PASSWORD }) });
if (!loginResponse.ok) {
  console.error(`API login failed (${loginResponse.status}): is the API running and the user an active admin?`);
  process.exit(2);
}
const AUTH = { Authorization: `Bearer ${(await loginResponse.json()).access_token}` };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !/40[19]|422/.test(m.text()) && errors.push(m.text()));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const path = () => new globalThis.URL(page.url()).pathname;
const token = () => page.evaluate(() => localStorage.getItem("nexova.token"));
const fieldError = (id) => page.locator(`#${id}-error`);
const NEW_EMAIL = `e2e-${Date.now()}@example.com`;

// 0. enlace desde /login
await page.goto(`${APP}/login`);
await page.getByRole("link", { name: "Regístrate" }).click();
await page.waitForURL("**/register");
ok(path() === "/register", "el login enlaza con /register");

// 1. validación en cliente (sin llamar a la API)
let signUps = 0;
page.on("request", (r) => r.method() === "POST" && r.url().endsWith("/users") && signUps++);
await page.getByRole("button", { name: "Crear cuenta" }).click();
ok(/obligatorio/.test(await fieldError("email").innerText()) && /obligatoria/.test(await fieldError("password").innerText()) && signUps === 0, "vacío: email y contraseña obligatorios, sin llamar a la API");
await page.getByLabel("Email").fill("no-es-email");
await page.getByLabel("Contraseña", { exact: true }).fill("corta");
await page.getByLabel("Repite la contraseña").fill("otra");
await page.getByLabel("Teléfono").fill("abc");
await page.getByRole("button", { name: "Crear cuenta" }).click();
ok(/no es válido/.test(await fieldError("email").innerText()) && /al menos 8/.test(await fieldError("password").innerText()) && /no coinciden/.test(await fieldError("confirmPassword").innerText()) && /teléfono no es válido/.test(await fieldError("phone").innerText()) && signUps === 0, "email, contraseña corta, confirmación distinta y teléfono inválido bloqueados en cliente");
ok(await page.getByLabel("Email").getAttribute("aria-invalid") === "true", "los campos con error se marcan con aria-invalid");

// 2. registro real: la API crea la cuenta pendiente, el login automático da 401 -> aviso de aprobación
let sentBody = null;
let autoLogin = 0;
page.on("request", (r) => {
  if (r.method() === "POST" && r.url().endsWith("/users")) sentBody = JSON.parse(r.postData());
  if (r.method() === "POST" && r.url().endsWith("/auth/login")) autoLogin++;
});
await page.getByLabel("Email").fill(`  ${NEW_EMAIL}  `);
await page.getByLabel("Contraseña", { exact: true }).fill("password-e2e-1");
await page.getByLabel("Repite la contraseña").fill("password-e2e-1");
await page.getByLabel("Nombre").fill("  Usuaria E2E ");
await page.getByLabel("Teléfono").fill("+34 600 000 000");
await page.getByLabel("Dirección").fill("");
await page.getByRole("button", { name: "Crear cuenta" }).click();
await page.getByRole("status").waitFor();
ok(sentBody?.email === NEW_EMAIL && sentBody.name === "Usuaria E2E" && sentBody.phone === "+34 600 000 000" && !("address" in sentBody) && !("confirmPassword" in sentBody), `POST /users lleva los campos del perfil recortados y omite los vacíos -> ${JSON.stringify({ ...sentBody, password: "***" })}`);
ok(autoLogin === 1, "tras el alta se intenta el login automático (POST /auth/login)");
ok(/aprobarla/.test(await page.getByRole("status").innerText()) && path() === "/register", "cuenta pendiente: aviso de aprobación en lugar de error");
ok((await token()) === null, "cuenta pendiente: no se guarda ningún token");
const users = await (await fetch(`${API}/users`, { headers: AUTH })).json();
const created = users.find((u) => u.email === NEW_EMAIL);
const profile = created && (await (await fetch(`${API}/profiles/${created.id}`, { headers: AUTH })).json());
ok(created && !created.is_active && created.role === "user" && profile?.name === "Usuaria E2E" && profile?.phone === "+34 600 000 000", "en la API: usuario inactivo con rol user y perfil con nombre y teléfono");
await page.getByRole("link", { name: "Ir a iniciar sesión" }).click();
await page.waitForURL("**/login");

// 3. email repetido -> 409 mostrado en el campo
await page.goto(`${APP}/register`);
await page.getByLabel("Email").fill(NEW_EMAIL.toUpperCase());
await page.getByLabel("Contraseña", { exact: true }).fill("password-e2e-1");
await page.getByLabel("Repite la contraseña").fill("password-e2e-1");
await page.getByRole("button", { name: "Crear cuenta" }).click();
await fieldError("email").waitFor();
ok(/Ya existe una cuenta/.test(await fieldError("email").innerText()) && (await page.getByLabel("Contraseña", { exact: true }).inputValue()) === "password-e2e-1", "email ya registrado (409): error en el campo y el formulario conserva los datos");

// 4. la API rechaza con 422 (se fuerza un nombre demasiado largo en la petición)
await page.route("**/users", async (route) => {
  if (route.request().method() !== "POST") return route.continue();
  const body = JSON.parse(route.request().postData());
  await route.continue({ postData: JSON.stringify({ ...body, email: `e2e-422-${Date.now()}@example.com`, name: "x".repeat(81) }) });
});
await page.getByRole("button", { name: "Crear cuenta" }).click();
await page.waitForFunction(() => document.querySelector("#name-error")?.textContent?.includes("80"));
ok(/at most 80/.test(await fieldError("name").innerText()), `422 de la API mostrado junto al campo -> "${await fieldError("name").innerText()}"`);
await page.unroute("**/users");

// 5. alta con login automático correcto: se simula una API que crea cuentas activas (el alta responde 201 y
//    el login real se hace con un usuario activo), para comprobar token + redirección.
await page.route("**/users", (route) =>
  route.request().method() === "POST"
    ? route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000", email: EMAIL, role: "user", is_active: true, created_at: new Date().toISOString(), message: "ok" }) })
    : route.continue(),
);
await page.goto(`${APP}/register`);
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
await page.getByLabel("Repite la contraseña").fill(PASSWORD);
await page.getByRole("button", { name: "Crear cuenta" }).click();
await page.waitForURL(`${APP}/`);
const stored = await token();
ok(path() === "/" && !!stored && stored.split(".").length === 3, "cuenta activa: login automático, token JWT guardado y redirección a /");
ok((await page.getByTestId("current-user").innerText()).length > 0, "la vista autenticada muestra el usuario de la sesión");
await page.unroute("**/users");

// 6. con sesión, /register y /login devuelven a la app
await page.goto(`${APP}/register`);
await page.waitForURL(`${APP}/`);
ok(path() === "/", "con sesión abierta, /register redirige a /");

ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
