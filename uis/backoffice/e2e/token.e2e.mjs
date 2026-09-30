// End-to-end check of the token lifecycle (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 seeded with suppliers (cd services/api && uv run seed --reset) and an active user,
// and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e:token
// Covers: login stores the token; every protected call carries `Authorization: Bearer <that token>` and the
// public ones none; logout removes it and goes to /login; a 401 from a protected call clears it and goes to
// /login; a late 401 for an old token does not end a newer session. (Storing it after sign-up: register.e2e.)
import { chromium } from "playwright";
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const API = process.env.E2E_API_URL ?? "http://localhost:8000";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
const apiToken = async () => {
  const r = await fetch(`${API}/auth/login`, { method: "POST", body: new URLSearchParams({ username: EMAIL, password: PASSWORD }) });
  if (!r.ok) {
    console.error(`API login failed (${r.status}): is the API running and the user active?`);
    process.exit(2);
  }
  return (await r.json()).access_token;
};
const AUTH = { Authorization: `Bearer ${await apiToken()}` };
const original = (await (await fetch(`${API}/auth/me`, { headers: AUTH })).json()).profile;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("401") && errors.push(m.text()));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const where = () => { const u = new globalThis.URL(page.url()); return `${u.pathname}${u.search}`; };
const token = () => page.evaluate(() => localStorage.getItem("nexova.token"));
const nav = (name) => page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name }).click();
async function login() {
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}
const calls = [];
page.on("request", (r) => {
  const path = new globalThis.URL(r.url()).pathname;
  if (/^\/(auth|api|profiles|users)(\/|$)/.test(path)) calls.push({ path: `${r.method()} ${path}`, auth: r.headers()["authorization"] ?? null });
});

// 1. login: el token se guarda en localStorage
await page.goto(`${APP}/login`);
await login();
await page.waitForURL(`${APP}/`);
const stored = await token();
ok(!!stored && stored.split(".").length === 3, "login: el JWT queda en localStorage (nexova.token)");

// 2. cada llamada protegida lleva Authorization: Bearer <token>; las públicas, ninguna
await nav("Proveedores");
await page.waitForSelector("tbody tr");
await nav("Mi perfil");
await page.getByLabel("Nombre").waitFor();
const phone = (await page.getByLabel("Teléfono").inputValue()) === "+34 600 111 222" ? "+34 600 111 333" : "+34 600 111 222";
await page.getByLabel("Teléfono").fill(phone);
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.getByRole("status").waitFor();
await nav("Análisis de incidentes");
await page.setInputFiles('input[type="file"]', new globalThis.URL("../../../data/raw/incidents-nexova.csv", import.meta.url).pathname);
await page.waitForResponse((r) => r.url().endsWith("/api/incidents/analyze"));
const isPublic = (c) => c.path === "POST /auth/login";
const protectedCalls = calls.filter((c) => !isPublic(c));
const kinds = [...new Set(protectedCalls.map((c) => c.path))];
ok(kinds.includes("GET /auth/me") && kinds.includes("GET /api/suppliers") && kinds.includes("PUT /profiles/me") && kinds.includes("POST /api/incidents/analyze"), `se han hecho llamadas protegidas de cada dominio: ${kinds.join(", ")}`);
ok(protectedCalls.every((c) => c.auth === `Bearer ${stored}`), `las ${protectedCalls.length} llamadas protegidas llevan Authorization: Bearer <token guardado>`);
ok(calls.filter(isPublic).every((c) => c.auth === null), "el login (público) no lleva cabecera Authorization");

// 3. logout: borra el token y lleva a /login; el siguiente login empieza en el inicio
await nav("Proveedores");
await page.waitForSelector("tbody tr");
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page.waitForURL("**/login");
ok(where() === "/login" && (await token()) === null, "logout: token eliminado y redirección a /login");
await page.goBack();
await page.waitForURL("**/login");
ok(where() === "/login", "tras el logout, 'atrás' no vuelve a mostrar la vista protegida");
await login();
await page.waitForURL(`${APP}/`);
ok(where() === "/", "tras un logout, el siguiente login va al inicio (no a la última vista del usuario anterior)");

// 4. una llamada protegida devuelve 401: se limpia el token y se va a /login (y se vuelve tras entrar)
await page.evaluate(() => localStorage.setItem("nexova.token", "token.caducado.invalido"));
await nav("Proveedores"); // client-side navigation: no reload, the list call gets the 401
await page.waitForURL("**/login");
ok(where() === "/login" && (await token()) === null, "401 en GET /api/suppliers: token limpiado y redirección a /login");
await login();
await page.waitForURL(`${APP}/suppliers`);
ok(where() === "/suppliers", "tras volver a entrar, regresa a la vista donde caducó la sesión");

// 5. un 401 tardío de un token antiguo no cierra una sesión más nueva
let release;
const held = new Promise((r) => (release = r));
await page.route("**/api/suppliers", async (route) => {
  await held;
  await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Could not validate credentials" }) });
});
await nav("Inicio");
await nav("Proveedores"); // this call is held with the current token...
await page.waitForTimeout(300);
const newer = await apiToken();
await page.evaluate((t) => localStorage.setItem("nexova.token", t), newer); // ...meanwhile a new login happens
release();
await page.waitForTimeout(800);
ok((await token()) === newer && where() === "/suppliers", "un 401 de la petición con el token viejo no borra el token nuevo");
await page.unroute("**/api/suppliers");

// Put the profile back as it was before step 2.
await fetch(`${API}/profiles/me`, {
  method: "PUT",
  headers: { ...AUTH, "Content-Type": "application/json" },
  body: JSON.stringify({ name: original.name, phone: original.phone, address: original.address }),
});

ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
