// End-to-end check of the suppliers page (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 seeded with a fresh directory (cd services/api && uv run seed --reset)
// with at least one active user, and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e
// It creates one supplier and edits/suspends Gusto, so re-seed with --reset before re-running.
// It also checks the login flow: redirect when logged out, bad password, stateless JWT (no cookies),
// expired token and logout.
import { chromium } from "playwright";
const SHOTS = process.env.E2E_SCREENSHOTS_DIR; // optional
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const API = process.env.E2E_API_URL ?? "http://localhost:8000";
const URL = `${APP}/suppliers`;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
// Token for the checks that talk to the API directly (the browser logs in through the UI).
const loginResponse = await fetch(`${API}/auth/login`, { method: "POST", body: new URLSearchParams({ username: EMAIL, password: PASSWORD }) });
if (!loginResponse.ok) {
  console.error(`API login failed (${loginResponse.status}): is the API running and the user active?`);
  process.exit(2);
}
const AUTH = { Authorization: `Bearer ${(await loginResponse.json()).access_token}` };
const shot = (name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("422") && !m.text().includes("401") && errors.push(m.text()));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
// The app's own alerts: Next.js adds a hidden route announcer that also has role="alert".
const appAlert = () => page.locator('[role="alert"]:not(#__next-route-announcer__)');
const rows = () => page.locator("tbody tr").count();
const rowOf = (n) => page.locator("tbody tr", { hasText: n });

// 0. sesión: JWT sin estado en el servidor
await page.goto(URL);
await page.waitForURL("**/login**");
ok(new globalThis.URL(page.url()).pathname === "/login", "sin sesión, /suppliers redirige a /login");
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Contraseña").fill("contraseña-incorrecta-1");
await page.getByRole("button", { name: "Entrar" }).click();
await appAlert().waitFor();
ok(/incorrectos/.test(await appAlert().innerText()) && new globalThis.URL(page.url()).pathname === "/login", "contraseña incorrecta: mensaje de error y se queda en /login");
ok(await page.evaluate(() => localStorage.getItem("nexova.token")) === null, "tras un login fallido no se guarda ningún token");
await page.getByLabel("Contraseña").fill(PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(URL);
await page.waitForSelector("tbody tr");
ok(new globalThis.URL(page.url()).pathname === "/suppliers", "login correcto: vuelve a la página que se pedía (/suppliers)");
const stored = await page.evaluate(() => localStorage.getItem("nexova.token"));
ok(!!stored && stored.split(".").length === 3, "el token JWT se guarda en el navegador (3 partes)");
ok((await page.context().cookies()).length === 0, "no hay cookies: la autenticación es solo el token en la cabecera");
ok((await page.getByTestId("current-user").innerText()).length > 0, "la barra lateral muestra el usuario de la sesión");
let sentAuth = 0;
page.on("request", (r) => r.url().includes("/api/suppliers") && r.headers()["authorization"]?.startsWith("Bearer ") && sentAuth++);
await page.reload();
await page.waitForSelector("tbody tr");
ok(sentAuth >= 1, "tras recargar, la sesión se recupera y las llamadas a la API llevan Authorization: Bearer");

// 1. listado desde la API con campos del CONTEXT
await page.goto(URL);
await page.waitForSelector("tbody tr");
ok((await rows()) === 15, `listado carga 15 filas desde la API (${await rows()})`);
console.log("      columnas:", (await page.locator("thead th").allInnerTexts()).join(" | "));
const first = await page.locator("tbody tr").first().innerText();
ok(/LinkedIn Talent Solutions/.test(first) && /Spain/.test(first) && /Portales de empleo/.test(first) && /1\.?200/.test(first) && /account@linkedin\.com/.test(first) && /Licencia corporativa/.test(first) && /Activo/.test(first) && /2025-03-31/.test(first),
   "fila 1 muestra nombre, país, categoría, tarifa, email, notas, renovación y estado");
await shot("list");

// 2. filtros sin recarga
let navigations = 0;
page.on("framenavigated", () => navigations++);
await page.selectOption('select[aria-label="Filtrar por país"]', "USA");
ok((await rows()) === 7, `filtro país USA -> ${await rows()} filas`);
await page.selectOption('select[aria-label="Filtrar por categoría"]', "ats_software");
ok((await rows()) === 1 && /Greenhouse/.test(await page.locator("tbody").innerText()), "USA + ATS -> solo Greenhouse");
await page.selectOption('select[aria-label="Filtrar por país"]', "Spain");
await page.selectOption('select[aria-label="Filtrar por categoría"]', "training_platforms");
ok((await rows()) === 1 && /Udemy/.test(await page.locator("tbody").innerText()), "Spain + Formación -> Udemy");
await page.selectOption('select[aria-label="Filtrar por categoría"]', "video_interview");
ok(/No hay proveedores con esos filtros/.test(await page.locator("tbody").innerText()), "sin coincidencias muestra mensaje vacío");
ok(navigations === 0, `filtrar no recarga la página (navegaciones: ${navigations})`);
await page.selectOption('select[aria-label="Filtrar por país"]', "");
await page.selectOption('select[aria-label="Filtrar por categoría"]', "");
ok((await rows()) === 15, "quitar filtros vuelve a 15");

// 3. formulario: validación en cliente
await page.getByRole("button", { name: "Nuevo proveedor" }).click();
let posts = 0;
page.on("request", (r) => r.method() === "POST" && posts++);
await page.getByRole("button", { name: "Guardar" }).click();
let alert = await appAlert().innerText();
ok(/nombre es obligatorio/.test(alert) && /tarifa/.test(alert) && /categoría/.test(alert) && posts === 0, `vacío: errores de cliente sin llamar a la API -> "${alert}"`);
await page.getByLabel("Nombre").fill("   ");
await page.getByLabel(/Tarifa mensual/).fill("-5");
await page.getByRole("button", { name: "Guardar" }).click();
alert = await appAlert().innerText();
ok(/nombre es obligatorio/.test(alert) && /mayor que 0/.test(alert) && posts === 0, "nombre en blanco y tarifa negativa bloqueados en cliente");
await page.getByLabel(/Email/).fill("no-es-email");
await page.getByRole("button", { name: "Guardar" }).click();
ok(/email no es válido/.test(await appAlert().innerText()) && posts === 0, "email inválido bloqueado en cliente");

// 3b. la API rechaza (se fuerza moneda incoherente en la petición para pasar la validación de cliente)
await page.route("**/api/suppliers", async (route) => {
  if (route.request().method() !== "POST") return route.continue();
  const body = JSON.parse(route.request().postData());
  body.currency = body.country === "Spain" ? "USD" : "EUR";
  await route.continue({ postData: JSON.stringify(body) });
});
await page.getByLabel("Nombre").fill("Proveedor E2E");
await page.getByLabel(/Tarifa mensual/).fill("50");
await page.getByLabel(/Email/).fill("");
await page.getByRole("button", { name: "Portales de empleo" }).click();
await page.getByRole("button", { name: "Guardar" }).click();
await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent?.includes("currency"));
alert = await appAlert().innerText();
ok(/currency must be EUR for country Spain/.test(alert), `error de la API mostrado -> "${alert}"`);
ok((await rows()) === 15 && (await page.getByLabel("Nombre").inputValue()) === "Proveedor E2E", "tras el rechazo, tabla intacta y datos del formulario conservados");
await shot("form-error");
await page.unroute("**/api/suppliers");
await page.getByRole("button", { name: "Guardar" }).click();
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 16);
ok((await page.locator("tbody tr").last().innerText()).includes("Proveedor E2E"), "alta válida: aparece en la tabla (16 filas) sin recargar");

// 4a. tarifa
const beforeTs = (await rowOf("Gusto").innerText()).match(/Actualizada .*/)[0];
await new Promise((r) => setTimeout(r, 1100));
await page.getByRole("button", { name: "Editar tarifa de Gusto" }).click();
await page.getByLabel("Nueva tarifa de Gusto").fill("333.5");
await page.getByRole("button", { name: "Guardar tarifa" }).click();
await page.waitForFunction(() => document.body.innerText.includes("333,50"));
const afterText = await rowOf("Gusto").innerText();
ok(/333,50/.test(afterText), "tarifa nueva visible en la fila tras la respuesta (333,50)");
ok(afterText.match(/Actualizada .*/)[0] !== beforeTs, `updated_at mostrado cambió: "${beforeTs}" -> "${afterText.match(/Actualizada .*/)[0]}"`);
const list = await (await fetch(`${API}/suppliers`, { headers: AUTH })).json();
ok(list.find((s) => s.name === "Gusto").monthly_rate === 333.5, "la tarifa quedó persistida en el servidor");
await page.getByRole("button", { name: "Editar tarifa de Gusto" }).click();
await page.getByLabel("Nueva tarifa de Gusto").fill("0");
await page.getByRole("button", { name: "Guardar tarifa" }).click();
const rejectedByBrowserOrApi = await page.getByLabel("Nueva tarifa de Gusto").isVisible();
await page.getByRole("button", { name: "Cancelar" }).click();
ok(rejectedByBrowserOrApi && /333,50/.test(await rowOf("Gusto").innerText()) && (await (await fetch(`${API}/suppliers`, { headers: AUTH })).json()).find((s) => s.name === "Gusto").monthly_rate === 333.5, "tarifa 0: el editor sigue abierto, no se aplica y el servidor conserva 333,5");

// 4b. estado + 5. distinción visual
const gustoId = list.find((s) => s.name === "Gusto").id;
const btnActive = page.getByRole("button", { name: "Suspender Gusto" });
const colorActive = await btnActive.evaluate((e) => getComputedStyle(e).color);
const opActive = await rowOf("Gusto").evaluate((e) => getComputedStyle(e).opacity);
await btnActive.click();
await page.getByRole("button", { name: "Activar Gusto" }).waitFor();
await page.waitForTimeout(500);
const colorSusp = await page.getByRole("button", { name: "Activar Gusto" }).evaluate((e) => getComputedStyle(e).color);
const opSusp = await rowOf("Gusto").evaluate((e) => getComputedStyle(e).opacity);
ok(/Suspendido/.test(await rowOf("Gusto").innerText()), "suspender: la fila pasa a 'Suspendido' tras la respuesta");
ok((await (await fetch(`${API}/suppliers/${gustoId}`, { headers: AUTH })).json()).status === "suspended", "estado suspendido persistido en el servidor");
ok(colorActive !== colorSusp && colorSusp === "rgb(253, 164, 175)" && colorActive === "rgb(110, 231, 183)", `badge cambia de color verde -> rojo (${colorActive} -> ${colorSusp})`);
ok(Number(opSusp) < Number(opActive), `fila suspendida atenuada (opacidad ${opActive} -> ${opSusp})`);
ok(Number(await rowOf("Greenhouse").evaluate((e) => getComputedStyle(e).opacity)) < 1, "Greenhouse (suspendido en el seed) también atenuado");
await shot("suspended");
await page.getByRole("button", { name: "Activar Gusto" }).click();
await page.getByRole("button", { name: "Suspender Gusto" }).waitFor();
ok(/Activo/.test(await rowOf("Gusto").innerText()), "reactivar: vuelve a 'Activo'");

// 6. token caducado/ inválido y cierre de sesión
await page.evaluate(() => localStorage.setItem("nexova.token", "token.caducado.invalido"));
await page.goto(URL);
await page.waitForURL("**/login**");
ok(await page.evaluate(() => localStorage.getItem("nexova.token")) === null, "token inválido: la API responde 401, se descarta y se pide login");
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Contraseña").fill(PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForSelector("tbody tr");
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page.waitForURL("**/login**");
ok(await page.evaluate(() => localStorage.getItem("nexova.token")) === null, "cerrar sesión borra el token y vuelve a /login");
await page.goto(`${APP}/incidents`);
await page.waitForURL("**/login**");
ok(true, "tras cerrar sesión, /incidents también redirige a /login");

ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
