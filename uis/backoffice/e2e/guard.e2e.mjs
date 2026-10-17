// End-to-end check of the route protection (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with an active user, the backoffice on :5174 (npm run dev) and, for the last
// block, the public website on :5173 (npm run dev from the repo root; skipped with E2E_WEBSITE_URL=none).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e:guard
// Covers: every protected view redirects to /login without a token (and nothing protected is shown or
// requested), the public views, the return to the requested URL, a token removed in the same tab or in another
// tab, a login in another tab, and that the public website needs no session.
import { chromium } from "playwright";
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const WEBSITE = process.env.E2E_WEBSITE_URL ?? "http://localhost:5173";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
const PROTECTED = ["/", "/incidents", "/suppliers", "/account/profile", "/no-existe"];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await context.newPage();
const errors = [];
const watch = (p) => {
  p.on("pageerror", (e) => errors.push(String(e)));
  // A 404 for /no-existe is expected: an unknown URL answers 404, then the app takes you home.
  const expected = (m) => m.text().includes("401") || (m.text().includes("404") && m.location().url.includes("/no-existe"));
  p.on("console", (m) => m.type() === "error" && !expected(m) && errors.push(m.text()));
};
watch(page);
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const where = (p) => { const u = new globalThis.URL(p.url()); return `${u.pathname}${u.search}`; };
const token = (p) => p.evaluate(() => localStorage.getItem("nexova.token"));
async function login(p) {
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Contraseña").fill(PASSWORD);
  await p.getByRole("button", { name: "Entrar" }).click();
}

// 1. sin token, todas las vistas protegidas (y las URL desconocidas) van a /login sin mostrar ni pedir nada
const apiCalls = [];
page.on("request", (r) => /\/(auth\/me|api\/|profiles|users)/.test(r.url()) && apiCalls.push(r.url()));
for (const route of PROTECTED) {
  await page.goto(`${APP}${route}`);
  await page.waitForURL("**/login**");
  const expected = ["/", "/no-existe"].includes(route) ? "/login" : `/login?next=${encodeURIComponent(route)}`;
  ok(where(page) === expected && (await page.getByRole("navigation", { name: "Navegación principal" }).count()) === 0, `sin token, ${route} redirige a ${expected} sin mostrar la vista`);
}
ok(apiCalls.length === 0, `sin token no se llama a ninguna ruta protegida de la API (${apiCalls.length})`);

// 2. vistas públicas del backoffice
for (const route of ["/login", "/register"]) {
  await page.goto(`${APP}${route}`);
  await page.waitForLoadState("networkidle");
  ok(where(page) === route, `${route} es accesible sin sesión`);
}

// 2b. ?next= solo acepta rutas de esta app: un enlace a /login?next=<otra web> no saca de aquí (open redirect)
for (const evil of ["https://evil.example.com", "//evil.example.com"]) {
  await page.goto(`${APP}/login?next=${encodeURIComponent(evil)}`);
  await login(page);
  await page.waitForURL(`${APP}/`);
  ok(page.url() === `${APP}/`, `?next=${evil}: tras el login se queda en la app (/)`);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/login**");
}

// 3. tras el login vuelve a la URL pedida, con su query string
await page.goto(`${APP}/suppliers?country=Spain`);
await page.waitForURL("**/login**");
await login(page);
await page.waitForURL(`${APP}/suppliers?country=Spain`);
ok(where(page) === "/suppliers?country=Spain", "tras el login vuelve a /suppliers?country=Spain");
await page.goto(`${APP}/no-existe`);
await page.waitForURL(`${APP}/`);
ok(where(page) === "/", "con sesión, una URL desconocida lleva al inicio");

// 4. token borrado a mano en la misma pestaña (sin pasar por la app): la siguiente navegación pide login
await page.evaluate(() => localStorage.removeItem("nexova.token"));
await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Proveedores" }).click();
await page.waitForURL("**/login**");
ok(where(page) === "/login?next=%2Fsuppliers", "token borrado en la misma pestaña: al navegar se redirige a /login?next=/suppliers");

// 5. dos pestañas: el logout en una cierra la sesión en la otra, sin recargar
await login(page);
await page.waitForURL(`${APP}/suppliers`);
ok(where(page) === "/suppliers", "tras volver a entrar, sigue en la vista que se pedía (/suppliers)");
const other = await context.newPage();
watch(other);
await other.goto(`${APP}/account/profile`);
await other.getByLabel("Nombre").waitFor();
ok(where(other) === "/account/profile", "la segunda pestaña comparte la sesión");
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await other.waitForURL("**/login**");
ok(where(other) === "/login?next=%2Faccount%2Fprofile" && (await token(other)) === null, "logout en una pestaña: la otra vuelve a /login sin recargar (recordando su vista)");

// 6. login en una pestaña: la otra, que estaba en /login, entra sola
await login(page);
await page.waitForURL(`${APP}/`);
await other.waitForURL(`${APP}/account/profile`);
ok(where(other) === "/account/profile", "login en una pestaña: la otra recupera la sesión y vuelve a la vista pedida");
await other.close();

// 7. el website público no necesita sesión
if (WEBSITE !== "none") {
  const pub = await browser.newPage();
  const sentAuth = [];
  pub.on("request", (r) => (r.headers()["authorization"] || /\/auth\//.test(r.url())) && sentAuth.push(r.url()));
  for (const route of ["/", "/talento"]) {
    await pub.goto(`${WEBSITE}${route}`);
    await pub.waitForLoadState("networkidle");
    ok(where(pub) === route && (await pub.locator("body").innerText()).length > 0 && !/Iniciar sesión/.test(await pub.locator("body").innerText()), `website público ${route}: carga sin sesión y sin pedir login`);
  }
  ok(sentAuth.length === 0 && (await pub.evaluate(() => Object.keys(localStorage))).length === 0, "el website no envía tokens ni llama a /auth, ni guarda nada en localStorage");
  await pub.close();
}

ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
