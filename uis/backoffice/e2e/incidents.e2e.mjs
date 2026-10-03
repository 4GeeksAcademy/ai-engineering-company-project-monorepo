// End-to-end check of the incident manager (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with the history loaded (services/api/.venv/bin/python scripts/seed_incidents.py --reset),
// at least one active user, and the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e:incidents
// It creates one incident per run (ticket ids keep growing); re-seed with --reset to start from 96 again.
import { chromium } from "playwright";
const SHOTS = process.env.E2E_SCREENSHOTS_DIR; // optional
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const shot = (name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const appAlert = () => page.locator('[role="alert"]:not(#__next-route-announcer__)');
const stat = (label) => page.locator("section[aria-label='Resumen de incidencias'] p", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::p").innerText();
const count = async () => Number((await page.getByText(/\d+ incidencias · página/).innerText()).match(/^(\d+)/)[1]);
const settle = () => page.waitForLoadState("networkidle");
// Filters are debounced (300 ms) and the list reloads asynchronously: wait until the count satisfies `test`.
const countWhere = async (test) => {
  await page.waitForFunction(
    ([src]) => {
      const m = document.body.innerText.match(/(\d+) incidencias · página/);
      return m && new Function("n", `return (${src})(n)`)(Number(m[1]));
    },
    [test.toString()],
  );
  return count();
};

// 0. login
await page.goto(`${APP}/incidents`);
await page.waitForURL("**/login**");
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Contraseña").fill(PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("heading", { name: "Panel de incidencias", exact: true }).waitFor();
await settle();

// 1. summary panel and list
const total0 = Number(await stat("Total"));
ok(total0 >= 96, `el panel de resumen muestra el total (${total0})`);
ok(
  (await Promise.all(["Abiertas", "En curso", "Resueltas", "Descartadas"].map(async (l) => Number(await stat(l))))).reduce((a, b) => a + b) === total0,
  "abiertas + en curso + resueltas + descartadas = total",
);
ok((await page.locator("tbody tr").count()) === 15, "la tabla muestra 15 filas por página");
ok(!(await page.locator("tbody").innerText()).includes("@"), "la lista no expone emails de clientes");
await shot("incidents-list");

// 2. filters
await page.getByRole("button", { name: "Abierta" }).click();
const open = await countWhere((n) => n < 96);
ok(open === Number(await stat("Abiertas")) && open > 0, `filtro por estado Abierta: ${open} incidencias`);
await page.getByLabel("Filtrar por categoría").selectOption("BILLING");
const openBilling = await countWhere((n) => n < 27);
ok(openBilling > 0 && openBilling < open, `filtros combinados (estado + categoría): ${openBilling}`);
await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
ok((await countWhere((n) => n === 96)) === total0, "limpiar filtros vuelve al total");
await page.getByLabel("Filtrar por origen").selectOption("branch");
await page.getByText("Ninguna incidencia coincide con estos filtros.").waitFor();
ok(true, "filtro por origen Sucursal: el histórico CSV es todo de clientes, sin resultados");
await page.getByLabel("Filtrar por origen").selectOption("customer");
await page.getByLabel("Filtrar por sucursal").selectOption("central");
ok((await countWhere((n) => n === 96)) === total0, "filtro por origen Cliente + sucursal central: todo el histórico");
await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
await countWhere((n) => n === 96);
await page.getByLabel("Buscar por id, título, cliente o sucursal").fill("zzz-sin-resultados");
await page.getByText("Ninguna incidencia coincide con estos filtros.").waitFor();
ok(true, "búsqueda sin resultados: mensaje claro");
await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
await settle();
await page.getByLabel("Creada desde").fill("2024-02-01");
await page.getByLabel("Hasta").fill("2024-01-01");
await page.getByText("La fecha «Desde» no puede ser posterior a «Hasta».").waitFor();
ok(true, "rango de fechas invertido: aviso sin llamar a la API");
await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
await settle();

// 3. registration page: reachable from the menu, every field, branch always visible and mandatory
const sidebar = page.getByRole("navigation", { name: "Navegación principal" });
await sidebar.getByRole("link", { name: "Nueva incidencia" }).click();
await page.getByRole("heading", { name: "Registrar incidencia" }).waitFor();
ok(new URL(page.url()).pathname === "/incidents/new" && (await sidebar.getByRole("link", { name: "Nueva incidencia" }).getAttribute("aria-current")) === "page", "la página de registro se abre desde el menú y queda marcada como activa");
ok((await sidebar.getByRole("link", { name: "Incidencias", exact: true }).getAttribute("aria-current")) === null, "en el menú solo está activa «Nueva incidencia»");
const form = page.locator("form[aria-label='Registrar incidencia']");
for (const id of ["title", "category", "origin", "branch", "description", "client_company", "agent_id", "customer_email"]) {
  if (!(await form.locator(`#incident-${id}`).isVisible())) { ok(false, `campo ${id} visible`); }
}
ok(true, "están todos los campos del modelo: título, categoría, origen, sucursal, descripción, empresa, agente y email");
ok((await form.getByText("obligatorio", { exact: true }).count()) === 5 && (await form.getByText("opcional", { exact: true }).count()) === 3, "5 campos obligatorios y 3 opcionales, indicado en cada etiqueta");
ok((await form.locator("#incident-branch").inputValue()) === "central" && (await form.locator("#incident-branch").isVisible()), "sucursal siempre visible, con «central» por defecto");
ok((await form.locator("[data-highlighted]").count()) === 0, "con origen Cliente la sucursal no está destacada");
await shot("incidents-new-form");

// origin = branch: the branch is highlighted, emptied and focused
await form.locator("#incident-origin").selectOption("branch");
ok((await form.locator("[data-highlighted='true'] #incident-branch").count()) === 1, "origen Sucursal: la sucursal se destaca visualmente");
ok(/viene de una sucursal/.test(await form.locator("[data-highlighted='true']").innerText()), "…con una nota que explica por qué");
ok((await form.locator("#incident-branch").inputValue()) === "" && (await form.locator("#incident-branch").evaluate((el) => el === document.activeElement)), "…se vacía «central» y el foco va a la sucursal");
await shot("incidents-new-branch-highlight");
await form.locator("#incident-origin").selectOption("customer");
ok((await form.locator("#incident-branch").inputValue()) === "central" && (await form.locator("[data-highlighted]").count()) === 0, "al volver a Cliente se restaura «central» y se quita el destacado");

// errors next to each field, in plain Spanish
await form.getByRole("button", { name: "Registrar incidencia" }).click();
const nextToField = async (id) => form.locator(`#incident-${id}`).locator("xpath=ancestor::div[contains(@class,'text-sm')][1]").locator(`#incident-${id}-error`).count();
ok((await nextToField("title")) === 1 && (await nextToField("category")) === 1 && (await nextToField("description")) === 1, "formulario vacío: el error de cada campo aparece junto a su campo");
ok(/al menos 3 caracteres/.test(await page.locator("#incident-title-error").innerText()) && /Selecciona una categoría/.test(await page.locator("#incident-category-error").innerText()), "los errores están en castellano y dicen qué hacer");
ok(/Revisa los 3 campos marcados/.test(await form.getByRole("alert").first().innerText()), "un aviso resume cuántos campos hay que revisar");
ok(await page.locator("#incident-title").evaluate((el) => el === document.activeElement) && (await page.locator("#incident-title").getAttribute("aria-invalid")) === "true", "el foco va al primer campo con error, marcado como inválido");
await shot("incidents-new-errors");
await page.locator("#incident-title").fill("ab");
ok((await page.locator("#incident-title-error").count()) === 0, "al escribir en un campo desaparece su error (se vuelve a validar al enviar)");

// origin Sucursal + «central» is refused with a specific message
await page.locator("#incident-title").fill("VPN se cae");
await page.locator("#incident-category").selectOption("TECHNICAL");
await page.locator("#incident-description").fill("La VPN se cae cada diez minutos");
await page.locator("#incident-origin").selectOption("branch");
await page.locator("#incident-branch").fill("Central");
await form.getByRole("button", { name: "Registrar incidencia" }).click();
ok(/Si viene de una sucursal, indica cuál/.test(await page.locator("#incident-branch-error").innerText()), "origen Sucursal con «central»: error específico junto a la sucursal");
await page.locator("#incident-branch").fill("Valencia Centro");
await page.locator("#incident-customer_email").fill("no-es-un-email");
await form.getByRole("button", { name: "Registrar incidencia" }).click();
ok(/email válido/.test(await page.locator("#incident-customer_email-error").innerText()), "email opcional pero inválido: error junto al campo");
await page.locator("#incident-customer_email").fill("");

// server errors: translated, next to the field, and nothing typed is lost
await page.route("**/api/incidents", (route) =>
  route.request().method() !== "POST" ? route.fallback() :
  route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "The request is not valid: title must have at least 3 characters.", detail: [{ field: "title", loc: ["body", "title"], msg: "title must have at least 3 characters", type: "string_too_short" }] }) }));
await form.getByRole("button", { name: "Registrar incidencia" }).click();
await page.locator("#incident-title-error").waitFor();
ok(/demasiado corto/.test(await page.locator("#incident-title-error").innerText()) && !/must have/.test(await form.innerText()), "error del servidor: junto al campo y en castellano, sin texto técnico");
ok((await page.locator("#incident-description").inputValue()) === "La VPN se cae cada diez minutos" && (await page.locator("#incident-branch").inputValue()) === "Valencia Centro", "lo escrito no se pierde");
await page.unroute("**/api/incidents");
await page.route("**/api/incidents", (route) => route.request().method() !== "POST" ? route.fallback() : route.abort());
await form.getByRole("button", { name: "Registrar incidencia" }).click();
await form.getByText("No se pudo conectar con el servidor").waitFor();
ok((await page.locator("#incident-title").inputValue()) === "VPN se cae", "sin conexión: mensaje claro y el formulario conserva los datos");
await page.unroute("**/api/incidents");
await page.route("**/api/incidents", (route) =>
  route.request().method() !== "POST" ? route.fallback() :
  route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "Internal server error. Please try again later.", error_id: "abc12345" }) }));
await form.getByRole("button", { name: "Registrar incidencia" }).click();
await form.getByText("El servidor ha tenido un problema").waitFor();
ok(/abc12345/.test(await form.innerText()) && !/Internal server error/.test(await form.innerText()), "error 500: mensaje genérico en castellano con referencia, sin texto técnico");
await page.unroute("**/api/incidents");

// loading state: indicator, disabled button, no double submit
let posts = 0;
await page.route("**/api/incidents", async (route) => {
  if (route.request().method() !== "POST") return route.fallback();
  posts++;
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return route.fallback();
});
const submit = form.getByRole("button", { name: /Registrar incidencia|Registrando/ });
await submit.click();
await submit.click({ force: true, noWaitAfter: true }).catch(() => undefined);
await form.getByRole("button", { name: "Registrando…" }).waitFor();
ok(await submit.isDisabled() && (await form.getByRole("button", { name: "Registrando…" }).locator("svg.animate-spin").count()) === 1, "durante el envío: botón deshabilitado con indicador de carga («Registrando…»)");
ok((await form.locator("fieldset").evaluate((el) => el.disabled)) && (await form.getAttribute("aria-busy")) === "true", "…y el resto del formulario queda bloqueado");
const created = page.getByRole("status").filter({ hasText: /Incidencia NXV-\d{6} registrada correctamente/ });
await created.waitFor();
await page.unroute("**/api/incidents");
ok(posts === 1, `un doble clic no envía dos veces (${posts} petición)`);
const ticket = (await created.innerText()).match(/NXV-\d{6}/)[0];

// success: confirmation + cleared form
ok(await created.evaluate((el) => el === document.activeElement), "tras el éxito el foco va al mensaje de confirmación");
ok(/«VPN se cae»/.test(await created.innerText()) && /sucursal Valencia Centro/.test(await created.innerText()), "la confirmación resume lo registrado");
ok(
  (await page.locator("#incident-title").inputValue()) === "" && (await page.locator("#incident-description").inputValue()) === "" &&
    (await page.locator("#incident-category").inputValue()) === "" && (await page.locator("#incident-origin").inputValue()) === "customer" &&
    (await page.locator("#incident-branch").inputValue()) === "central" && (await page.locator("#incident-customer_email").inputValue()) === "",
  "el formulario queda limpio (origen Cliente, sucursal «central») y sin errores",
);
ok((await form.locator("p.text-rose-300").count()) === 0 && (await form.getByRole("alert").count()) === 0, "…sin restos de errores");
await shot("incidents-new-success");
await page.goto(`${APP}/incidents`);
await page.getByRole("heading", { name: "Panel de incidencias", exact: true }).waitFor();
await page.waitForFunction((n) => document.body.innerText.includes(`${n}`), total0 + 1);
ok(Number(await stat("Total")) === total0 + 1, `incidencia ${ticket} registrada (sin cliente ni email) y el resumen se actualiza`);

// 4. detail + lifecycle: open -> in_progress -> resolved; resolved is final
await page.getByRole("link", { name: ticket }).click();
await page.getByRole("heading", { name: new RegExp(ticket) }).waitFor();
ok((await page.getByText("Valencia Centro").first().isVisible()) && (await page.getByRole("button", { name: "Editar" }).isVisible()), "detalle: abierta, de la sucursal Valencia Centro y editable");
ok((await page.getByRole("button", { name: "Resolver", exact: true }).count()) === 0, "desde Abierta no se puede resolver directamente");
ok((await page.getByRole("button", { name: /Abrir|Reabrir/ }).count()) === 0, "no hay forma de volver a Abierta");
await page.getByRole("button", { name: "Poner en curso", exact: true }).click();
await page.getByRole("button", { name: /Confirmar: poner en curso/ }).click();
await page.getByText("Estado actualizado.").waitFor();
ok((await page.getByRole("button", { name: "Editar" }).isVisible()) && (await page.getByRole("button", { name: "Resolver", exact: true }).isVisible()), "en curso: sigue editable y ya se puede resolver");
ok((await page.getByRole("button", { name: /Abrir|Reabrir|Devolver/ }).count()) === 0, "en curso: no se puede volver a Abierta");
await page.getByRole("button", { name: "Editar" }).click();
await page.locator("#incident-title").fill("VPN se cae cada cinco minutos");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.getByText("Cambios guardados.").waitFor();
ok(await page.getByText("VPN se cae cada cinco minutos").first().isVisible(), "edición guardada");
await page.getByRole("button", { name: "Resolver", exact: true }).click();
await page.locator("label", { hasText: /^4Satisfecho$/ }).click();
await page.getByRole("button", { name: /Confirmar: resolver/ }).click();
await page.getByText("4 / 5").waitFor();
ok(
  (await page.getByRole("button", { name: "Editar" }).count()) === 0 &&
    (await page.locator("section[aria-label='Cambiar estado'] button").count()) === 0 &&
    /estado final/.test(await page.locator("section[aria-label='Cambiar estado']").innerText()),
  "resuelta: estado final, sin botones de edición ni de cambio de estado",
);
const history = await page.locator("section[aria-label='Historial'] li").allInnerTexts();
ok(history.length === 4 && history[0].includes("En curso → Resuelta") && history.at(-1).includes("Incidencia creada"), `historial completo (${history.length} eventos)`);
await shot("incidents-detail");

// 4b. discard from Abierta: the reason is optional but, if given, must be meaningful
await page.goto(`${APP}/incidents/new`);
await page.locator("#incident-title").fill("Aviso duplicado");
await page.locator("#incident-category").selectOption("ACCESS");
await page.locator("#incident-description").fill("Registrada por error, ya existe otra");
await page.getByRole("button", { name: "Registrar incidencia" }).click();
const second = page.getByRole("status").filter({ hasText: /Incidencia NXV-\d{6} registrada correctamente/ });
await second.waitFor();
const secondId = (await second.innerText()).match(/NXV-\d{6}/)[0];
await second.getByRole("link", { name: "Ver incidencia" }).click();
await page.getByRole("heading", { name: new RegExp(secondId) }).waitFor();
await page.getByRole("button", { name: "Descartar", exact: true }).click();
await page.getByLabel("Motivo del descarte (opcional)").fill("ok");
await page.getByRole("button", { name: /Confirmar: descartar/ }).click();
ok(/motivo/i.test(await page.locator("#reason-error").innerText()), "descartar con un motivo demasiado corto: error de validación");
await page.getByLabel("Motivo del descarte (opcional)").fill("");
await page.getByRole("button", { name: /Confirmar: descartar/ }).click();
await page.getByText("Estado actualizado.").waitFor();
ok(/estado final/.test(await page.locator("section[aria-label='Cambiar estado']").innerText()), "descartada sin motivo: estado final");

// 5. errors a user can act on
await page.goto(`${APP}/incidents/NXV-999999`);
await page.getByRole("heading", { name: "Incidencia no encontrada" }).waitFor();
ok(true, "ticket inexistente: pantalla de no encontrada");
await page.route("**/api/incidents?**", (route) => route.abort());
await page.goto(`${APP}/incidents`);
await appAlert().waitFor();
ok(/No se pudo conectar con el servidor/.test(await appAlert().innerText()), "sin conexión con la API: mensaje claro");
await page.unroute("**/api/incidents?**");

// 6. the panel: loading indicator, retry, empty states, status changes from the list
const LIST = "**/api/incidents?**";
const slow = (ms) => async (route) => { await new Promise((r) => setTimeout(r, ms)); return route.fallback(); };

await page.route(LIST, slow(1500));
await page.goto(`${APP}/incidents`);
await page.getByRole("status").filter({ hasText: "Cargando incidencias…" }).waitFor();
ok(true, "primera carga: indicador «Cargando incidencias…»");
await page.locator("tbody tr").first().waitFor();
await page.getByLabel("Filtrar por categoría").selectOption("ACCESS");
await page.getByRole("status").filter({ hasText: "Actualizando…" }).waitFor();
ok(true, "al filtrar: indicador «Actualizando…» sobre la tabla anterior");
await page.unroute(LIST);
await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
await countWhere((n) => n >= 90);

await page.route(LIST, (route) => route.abort());
await page.getByLabel("Filtrar por categoría").selectOption("BILLING");
const failure = page.getByRole("alert").filter({ hasText: "No se pudo conectar con el servidor" });
await failure.waitFor();
ok(await failure.getByRole("button", { name: "Reintentar" }).isVisible(), "si falla la carga: mensaje claro con botón «Reintentar»");
await page.unroute(LIST);
await failure.getByRole("button", { name: "Reintentar" }).click();
await page.locator("tbody tr").first().waitFor();
await failure.waitFor({ state: "detached" });
ok(true, "«Reintentar» vuelve a cargar y el aviso desaparece");
await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
await countWhere((n) => n >= 90);

await page.route(LIST, (route) => route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 15, pages: 0 } }));
await page.route("**/api/incidents/summary?**", (route) => route.fulfill({ json: { total: 0, status_counts: { open: 0, in_progress: 0, resolved: 0, discarded: 0 }, status_percentages: {}, category_counts: { TECHNICAL: 0, BILLING: 0, ACCESS: 0, HR_QUERY: 0, COMPLAINT: 0 }, category_percentages: {}, origin_counts: { customer: 0, branch: 0, internal: 0 }, branch_counts: { central: 0 }, branch_percentages: { central: 0 }, active_by_category: {}, satisfaction_average: null, satisfaction_scored: 0, satisfaction_distribution: {}, top_branches: [], top_clients: [] } }));
await page.goto(`${APP}/incidents`);
await page.getByText("Todavía no hay incidencias registradas.").waitFor();
ok(await page.getByRole("link", { name: "Registrar la primera incidencia" }).isVisible(), "sin datos: mensaje informativo con acceso a registrar la primera");
ok(Number(await stat("Total")) === 0, "…y el resumen en cero");
await page.unroute(LIST);
await page.unroute("**/api/incidents/summary?**");

// status from the row
await page.goto(`${APP}/incidents`);
await page.getByRole("button", { name: "Abierta" }).click();
await countWhere((n) => n < 96);
const rows = page.locator("tbody tr");
const firstId = (await rows.nth(0).locator("a").first().innerText()).trim();
const otherId = (await rows.nth(1).locator("a").first().innerText()).trim();
const row = (id) => page.locator("tbody tr", { hasText: id });
const control = (id) => page.getByLabel(`Cambiar el estado de ${id}`);
const badge = async (id) => (await row(id).locator("span.rounded-full").first().innerText()).trim(); // the status shown, not the dropdown options
const openBefore = Number(await stat("Abiertas")); // the summary follows the active filter (Abierta)
ok((await control(firstId).locator("option").allInnerTexts()).join("|") === "Cambiar…|En curso|Descartada", "cada fila abierta ofrece solo las transiciones válidas: En curso o Descartada");

// failure: the old status comes back and the person is told
await page.route(`**/api/incidents/${firstId}/status`, (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "Internal server error. Please try again later.", error_id: "e2e00001" }) }));
await control(firstId).selectOption("in_progress");
const banner = page.getByRole("alert").filter({ hasText: `No se pudo pasar ${firstId}` });
await banner.waitFor();
ok((await badge(firstId)) === "Abierta", "si falla el cambio: la fila vuelve visualmente a «Abierta»");
ok(/restaurado su estado anterior \(Abierta\)/.test(await banner.innerText()) && /e2e00001/.test(await banner.innerText()) && (await row(firstId).getAttribute("data-failed")) === "true", "…con un mensaje que explica qué pasó y la fila señalada");
ok(Number(await stat("Abiertas")) === openBefore, "…y los totales no cambian");
await shot("incidents-panel-status-failed");
await page.unroute(`**/api/incidents/${firstId}/status`);
await banner.getByRole("button", { name: "Cerrar" }).click();

// success: optimistic first (slow server), then confirmed
await page.route(`**/api/incidents/${firstId}/status`, slow(1200));
await control(firstId).selectOption("in_progress");
await row(firstId).getByText("Guardando…").waitFor();
ok((await badge(firstId)) === "En curso", "al cambiar: la fila muestra el nuevo estado enseguida, con «Guardando…»");
await row(firstId).getByText("Guardando…").waitFor({ state: "detached" });
await page.unroute(`**/api/incidents/${firstId}/status`);
ok((await control(firstId).locator("option").allInnerTexts()).join("|") === "Cambiar…|Resuelta|Descartada", "guardado: ahora ofrece Resuelta o Descartada");
await page.waitForFunction((n) => [...document.querySelectorAll("section[aria-label='Resumen de incidencias'] p")].some((p) => p.textContent === "Abiertas" && Number(p.nextElementSibling?.textContent) === n), openBefore - 1);
ok(true, "los totales del panel se actualizan (Abiertas −1)");

// final states ask first
await control(firstId).selectOption("resolved");
ok(/¿Pasar a Resuelta\? Es definitivo\./.test(await row(firstId).innerText()), "pasar a un estado final pide confirmación");
await row(firstId).getByRole("button", { name: "Cancelar" }).click();
ok((await badge(firstId)) === "En curso", "cancelar no cambia nada");
await control(firstId).selectOption("resolved");
await row(firstId).getByRole("button", { name: "Confirmar" }).click();
await row(firstId).getByText("Guardando…").waitFor({ state: "detached" });
ok((await badge(firstId)) === "Resuelta", "confirmado: la fila queda «Resuelta»");
ok((await page.getByLabel(`Cambiar el estado de ${firstId}`).count()) === 0, "resuelta desde el listado: estado final, sin más cambios");

// a refused change (conflict) also goes back
await page.route(`**/api/incidents/${otherId}/status`, (route) => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "Incident is already resolved" }) }));
await control(otherId).selectOption("in_progress");
await page.getByRole("alert").filter({ hasText: `No se pudo pasar ${otherId}` }).waitFor();
ok((await badge(otherId)) === "Abierta", "un conflicto (409) también revierte la fila y avisa");
await page.unroute(`**/api/incidents/${otherId}/status`);

ok(errors.length === 0, `sin errores de JavaScript en la página${errors.length ? ": " + errors.join(" | ") : ""}`);
await browser.close();
console.log(fails === 0 ? "\nAll checks passed." : `\n${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
