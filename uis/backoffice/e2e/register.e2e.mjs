// End-to-end check of the sign-up page (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with an active user, and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=admin@example.com E2E_PASSWORD=... npm run e2e:register
// It creates two users with unique emails on every run (no reset needed).
// Covers: client validation, POST /users with the optional profile, the automatic login (token stored, redirect,
// session usable), 409 and 422 from the API, and an automatic login that fails after the account was created.
import { chromium } from "playwright";
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const API = process.env.E2E_API_URL ?? "http://localhost:8000";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
const loginResponse = await fetch(`${API}/auth/login`, { method: "POST", body: new URLSearchParams({ username: EMAIL, password: PASSWORD }) });
if (!loginResponse.ok) {
  console.error(`API login failed (${loginResponse.status}): is the API running and the user active?`);
  process.exit(2);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !/40[19]|422|503/.test(m.text()) && errors.push(m.text()));
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

// 2. registro real: la API crea la cuenta activa, login automático, token guardado y redirección a /
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
await page.waitForURL(`${APP}/`);
ok(sentBody?.email === NEW_EMAIL && sentBody.name === "Usuaria E2E" && sentBody.phone === "+34 600 000 000" && !("address" in sentBody) && !("confirmPassword" in sentBody), `POST /users lleva los campos del perfil recortados y omite los vacíos -> ${JSON.stringify({ ...sentBody, password: "***" })}`);
ok(autoLogin === 1, "tras el alta se hace el login automático (POST /auth/login)");
const stored = await token();
ok(path() === "/" && !!stored && stored.split(".").length === 3, "alta: token JWT guardado en localStorage y redirección a /");
await page.getByTestId("current-user").waitFor();
ok((await page.getByTestId("current-user").innerText()) === "Usuaria E2E", "la vista autenticada muestra al usuario recién registrado");
const me = await (await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })).json();
ok(me.email === NEW_EMAIL && me.is_active && me.role === "user" && me.profile.name === "Usuaria E2E" && me.profile.phone === "+34 600 000 000", "en la API: usuario activo con rol user y perfil con nombre y teléfono; el token es válido");
await page.getByRole("button", { name: "Cerrar sesión" }).click();
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

// 5. la cuenta se crea pero el login automático falla (se simula un fallo del servidor): aviso, no error
const OTHER_EMAIL = `e2e-other-${Date.now()}@example.com`;
await page.route("**/auth/login", (route) => route.fulfill({ status: 503, body: "" }));
await page.goto(`${APP}/register`);
await page.getByLabel("Email").fill(OTHER_EMAIL);
await page.getByLabel("Contraseña", { exact: true }).fill("password-e2e-2");
await page.getByLabel("Repite la contraseña").fill("password-e2e-2");
await page.getByRole("button", { name: "Crear cuenta" }).click();
await page.getByRole("status").waitFor();
ok(/Cuenta creada/.test(await page.getByRole("status").innerText()) && (await page.getByRole("alert").count()) === 0 && (await token()) === null, "login automático fallido: aviso de cuenta creada (no error) y ningún token");
await page.unroute("**/auth/login");
await page.getByRole("link", { name: "Ir a iniciar sesión" }).click();
await page.waitForURL("**/login");
await page.getByLabel("Email").fill(OTHER_EMAIL);
await page.getByLabel("Contraseña").fill("password-e2e-2");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(`${APP}/`);
ok(path() === "/" && !!(await token()), "esa cuenta ya existe y entra desde /login");

// 6. con sesión, /register y /login devuelven a la app
await page.goto(`${APP}/register`);
await page.waitForURL(`${APP}/`);
ok(path() === "/", "con sesión abierta, /register redirige a /");

ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
