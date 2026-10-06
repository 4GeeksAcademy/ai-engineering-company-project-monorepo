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
await page.getByRole("heading", { name: "Incidencias", exact: true }).waitFor();
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
await page.getByRole("button", { name: "Limpiar filtros" }).click();
ok((await countWhere((n) => n === 96)) === total0, "limpiar filtros vuelve al total");
await page.getByLabel("Filtrar por origen").selectOption("branch");
await page.getByText("Ninguna incidencia coincide con estos filtros.").waitFor();
ok(true, "filtro por origen Sucursal: el histórico CSV es todo de clientes, sin resultados");
await page.getByLabel("Filtrar por origen").selectOption("customer");
await page.getByLabel("Filtrar por sucursal").selectOption("central");
ok((await countWhere((n) => n === 96)) === total0, "filtro por origen Cliente + sucursal central: todo el histórico");
await page.getByRole("button", { name: "Limpiar filtros" }).click();
await countWhere((n) => n === 96);
await page.getByLabel("Buscar por id, título, cliente o sucursal").fill("zzz-sin-resultados");
await page.getByText("Ninguna incidencia coincide con estos filtros.").waitFor();
ok(true, "búsqueda sin resultados: mensaje claro");
await page.getByRole("button", { name: "Limpiar filtros" }).click();
await settle();
await page.getByLabel("Creada desde").fill("2024-02-01");
await page.getByLabel("Hasta").fill("2024-01-01");
await page.getByText("La fecha «Desde» no puede ser posterior a «Hasta».").waitFor();
ok(true, "rango de fechas invertido: aviso sin llamar a la API");
await page.getByRole("button", { name: "Limpiar filtros" }).click();
await settle();

// 3. create: client-side validation, then success
await page.getByRole("button", { name: "Nueva incidencia" }).click();
await page.getByRole("button", { name: "Crear incidencia" }).click();
const inlineErrors = await page.locator("form[aria-label='Nueva incidencia'] p.text-rose-300").allInnerTexts();
ok(inlineErrors.length === 3, `formulario vacío: error en título, descripción y categoría (${inlineErrors.length})`);
ok(await page.locator("#incident-title").evaluate((el) => el === document.activeElement), "el foco va al primer campo con error");
await page.locator("#incident-title").fill("VPN se cae");
await page.locator("#incident-category").selectOption("TECHNICAL");
await page.locator("#incident-description").fill("La VPN se cae cada diez minutos");
await page.locator("#incident-origin").selectOption("branch");
await page.getByRole("button", { name: "Crear incidencia" }).click();
ok(/indica cuál/.test(await page.locator("#incident-branch-error").innerText()), "origen Sucursal con sucursal «central»: error específico");
await page.locator("#incident-branch").fill("Valencia Centro");
await page.locator("#incident-customer_email").fill("no-es-un-email");
await page.getByRole("button", { name: "Crear incidencia" }).click();
ok(/email válido/.test(await page.locator("#incident-customer_email-error").innerText()), "email inválido (opcional pero si se rellena debe ser válido)");
await shot("incidents-form-errors");
await page.locator("#incident-customer_email").fill("");
await page.getByRole("button", { name: "Crear incidencia" }).click();
const created = page.getByRole("status").filter({ hasText: /Incidencia NXV-\d{6} creada/ });
await created.waitFor();
const ticket = (await created.innerText()).match(/NXV-\d{6}/)[0];
await page.waitForFunction((n) => document.body.innerText.includes(`${n}`), total0 + 1);
ok(Number(await stat("Total")) === total0 + 1, `incidencia ${ticket} creada (sin cliente ni email) y el resumen se actualiza`);

// 4. detail + lifecycle
await page.getByRole("link", { name: ticket }).click();
await page.getByRole("heading", { name: new RegExp(ticket) }).waitFor();
ok((await page.getByText("Valencia Centro").first().isVisible()) && (await page.getByRole("button", { name: "Editar" }).isVisible()), "detalle: abierta, de la sucursal Valencia Centro y editable");
ok((await page.getByRole("button", { name: "Resolver", exact: true }).count()) === 0, "desde Abierta no se puede resolver directamente");
await page.getByRole("button", { name: "Poner en curso", exact: true }).click();
await page.getByRole("button", { name: /Confirmar: poner en curso/ }).click();
await page.getByText("Estado actualizado.").waitFor();
ok((await page.getByRole("button", { name: "Editar" }).isVisible()) && (await page.getByRole("button", { name: "Resolver", exact: true }).isVisible()), "en curso: sigue editable y ya se puede resolver");
await page.getByRole("button", { name: "Resolver", exact: true }).click();
await page.locator("label", { hasText: /^4Satisfecho$/ }).click();
await page.getByRole("button", { name: /Confirmar: resolver/ }).click();
await page.getByText("4 / 5").waitFor();
ok((await page.getByRole("button", { name: "Editar" }).count()) === 0, "resuelta con puntuación 4; ya no se puede editar");
ok((await page.getByRole("button", { name: "Descartar" }).count()) === 0, "desde Resuelta no se puede descartar (solo reabrir)");
await page.getByRole("button", { name: "Reabrir", exact: true }).click();
await page.getByRole("button", { name: /Confirmar: reabrir/ }).click();
await page.getByRole("button", { name: "Editar" }).waitFor();
ok(true, "reabierta: vuelve a ser editable");
await page.getByRole("button", { name: "Editar" }).click();
await page.locator("#incident-title").fill("VPN se cae cada cinco minutos");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.getByText("Cambios guardados.").waitFor();
ok(await page.getByText("VPN se cae cada cinco minutos").first().isVisible(), "edición guardada");
await page.getByRole("button", { name: "Descartar", exact: true }).click();
await page.getByLabel("Motivo del descarte").fill("ok");
await page.getByRole("button", { name: /Confirmar: descartar/ }).click();
ok(/motivo/i.test(await page.locator("#reason-error").innerText()), "descartar con motivo corto: error de validación");
await page.getByLabel("Motivo del descarte").fill("Duplicada de otra incidencia");
await page.getByRole("button", { name: /Confirmar: descartar/ }).click();
await page.getByText("Estado actualizado.").waitFor();
const history = await page.locator("section[aria-label='Historial'] li").allInnerTexts();
ok(history.length === 6 && history[0].includes("Abierta → Descartada") && history.at(-1).includes("Incidencia creada"), `historial completo (${history.length} eventos)`);
await shot("incidents-detail");

// 5. errors a user can act on
await page.goto(`${APP}/incidents/NXV-999999`);
await page.getByRole("heading", { name: "Incidencia no encontrada" }).waitFor();
ok(true, "ticket inexistente: pantalla de no encontrada");
await page.route("**/api/incidents?**", (route) => route.abort());
await page.goto(`${APP}/incidents`);
await appAlert().waitFor();
ok(/No se pudo conectar con el servidor/.test(await appAlert().innerText()), "sin conexión con la API: mensaje claro");
await page.unroute("**/api/incidents?**");

ok(errors.length === 0, `sin errores de JavaScript en la página${errors.length ? ": " + errors.join(" | ") : ""}`);
await browser.close();
console.log(fails === 0 ? "\nAll checks passed." : `\n${fails} check(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
