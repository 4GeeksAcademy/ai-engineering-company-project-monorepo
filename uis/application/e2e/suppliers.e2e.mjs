// End-to-end check of the suppliers page (needs a browser: npx playwright install chromium; set E2E_BROWSER=firefox|webkit to change it).
// Prerequisites: API on :8000 seeded with a fresh directory (cd services/api && uv run seed --reset)
// and the app on :5175 (npm run dev). Run from uis/application: npm run e2e
// It creates one supplier and edits/suspends Gusto, so re-seed with --reset before re-running.
import * as playwright from "playwright";
const browserName = process.env.E2E_BROWSER ?? "chromium"; // chromium | firefox | webkit
const SHOTS = process.env.E2E_SCREENSHOTS_DIR; // optional
const APP = process.env.E2E_APP_URL ?? "http://localhost:5175";
const API = process.env.E2E_API_URL ?? "http://localhost:8000";
const URL = `${APP}/suppliers`;
const shot = (name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());
const browser = await playwright[browserName].launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("422") && errors.push(m.text()));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const rows = () => page.locator("tbody tr").count();
const rowOf = (n) => page.locator("tbody tr", { hasText: n });

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
let alert = await page.getByRole("alert").innerText();
ok(/nombre es obligatorio/.test(alert) && /tarifa/.test(alert) && /categoría/.test(alert) && posts === 0, `vacío: errores de cliente sin llamar a la API -> "${alert}"`);
await page.getByLabel("Nombre").fill("   ");
await page.getByLabel(/Tarifa mensual/).fill("-5");
await page.getByRole("button", { name: "Guardar" }).click();
alert = await page.getByRole("alert").innerText();
ok(/nombre es obligatorio/.test(alert) && /mayor que 0/.test(alert) && posts === 0, "nombre en blanco y tarifa negativa bloqueados en cliente");
await page.getByLabel(/Email/).fill("no-es-email");
await page.getByRole("button", { name: "Guardar" }).click();
ok(/email no es válido/.test(await page.getByRole("alert").innerText()) && posts === 0, "email inválido bloqueado en cliente");

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
alert = await page.getByRole("alert").innerText();
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
const list = await (await fetch(`${API}/suppliers`)).json();
ok(list.find((s) => s.name === "Gusto").monthly_rate === 333.5, "la tarifa quedó persistida en el servidor");
await page.getByRole("button", { name: "Editar tarifa de Gusto" }).click();
await page.getByLabel("Nueva tarifa de Gusto").fill("0");
await page.getByRole("button", { name: "Guardar tarifa" }).click();
const rejectedByBrowserOrApi = await page.getByLabel("Nueva tarifa de Gusto").isVisible();
await page.getByRole("button", { name: "Cancelar" }).click();
ok(rejectedByBrowserOrApi && /333,50/.test(await rowOf("Gusto").innerText()) && (await (await fetch(`${API}/suppliers`)).json()).find((s) => s.name === "Gusto").monthly_rate === 333.5, "tarifa 0: el editor sigue abierto, no se aplica y el servidor conserva 333,5");

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
ok((await (await fetch(`${API}/suppliers/${gustoId}`)).json()).status === "suspended", "estado suspendido persistido en el servidor");
ok(colorActive !== colorSusp && colorSusp === "rgb(253, 164, 175)" && colorActive === "rgb(110, 231, 183)", `badge cambia de color verde -> rojo (${colorActive} -> ${colorSusp})`);
ok(Number(opSusp) < Number(opActive), `fila suspendida atenuada (opacidad ${opActive} -> ${opSusp})`);
ok(Number(await rowOf("Greenhouse").evaluate((e) => getComputedStyle(e).opacity)) < 1, "Greenhouse (suspendido en el seed) también atenuado");
await shot("suspended");
await page.getByRole("button", { name: "Activar Gusto" }).click();
await page.getByRole("button", { name: "Suspender Gusto" }).waitFor();
ok(/Activo/.test(await rowOf("Gusto").innerText()), "reactivar: vuelve a 'Activo'");

// 6. renovaciones próximas: se resaltan solo las que vencen en <= 60 días
const isoIn = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
for (const [name, n] of [["Renueva en 30 dias", 30], ["Renueva en 61 dias", 61]]) {
  await fetch(`${API}/suppliers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, country: "Spain", categories: ["job_boards"], monthly_rate: 10, currency: "EUR", status: "active", contract_renewal_date: isoIn(n) }) });
}
await page.reload();
await page.waitForSelector("tbody tr");
const soonRow = rowOf("Renueva en 30 dias"), lateRow = rowOf("Renueva en 61 dias");
ok(/Renueva en 30 días/.test(await soonRow.innerText()) && !/Renueva en \d+ días/.test(await lateRow.innerText()), "renovación a 30 días muestra aviso; a 61 días no");
const border = (r) => r.locator("td").first().evaluate((e) => getComputedStyle(e).borderLeftWidth);
ok((await border(soonRow)) === "4px" && (await border(lateRow)) === "0px", "renovación próxima: borde ámbar visible en la fila; la lejana no lo tiene");
ok(/Fecha vencida/.test(await rowOf("LinkedIn").innerText()), "fecha pasada: 'Fecha vencida' en rojo");

ok(errors.length === 0, `sin errores de consola/página (${errors.length}) ${errors.slice(0, 2).join(" || ")}`);
console.log(fails === 0 ? "\nALL OK" : `\n${fails} FAILED`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
