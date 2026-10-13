// End-to-end check of the inventory section (needs Chromium: npx playwright install chromium).
// Prerequisites: API on :8000 with an active user and the inventory seed, the backoffice on :5174 (npm run dev).
// Run from uis/backoffice:  E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e:inventory
// Read-only: it never registers an order. The API's 400 is simulated by answering the POST in the browser, so the
// stock in the database is left as it was.
// Covers: the four views redirect to /login without a session, the stock table with its colour-coded levels and a
// link per row, the available stock shown before sending, the warning for more than the stock, a 400 shown as a
// sentence next to the quantity, and the read-only order history with asset names and the user_uuid of each order.
import { chromium } from "playwright";
const APP = process.env.E2E_APP_URL ?? "http://localhost:5174";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set E2E_EMAIL and E2E_PASSWORD to an active API user (see the header of this file).");
  process.exit(2);
}
const VIEWS = ["/inventory/products", "/inventory/orders/inbound", "/inventory/orders/outbound", "/inventory/orders"];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("401") && errors.push(m.text()));
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${msg}`); };
const where = (p) => { const u = new globalThis.URL(p.url()); return `${u.pathname}${u.search}`; };

// 1. sin sesión, las cuatro vistas llevan al login y no muestran nada
for (const route of VIEWS) {
  await page.goto(`${APP}${route}`);
  await page.waitForURL("**/login**");
  ok(where(page) === `/login?next=${encodeURIComponent(route)}`, `sin sesión, ${route} redirige a /login?next=…`);
}

// 2. login y vuelta a la vista pedida
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Contraseña").fill(PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(`**${VIEWS[0]}`);
ok(where(page) === VIEWS[0], "tras el login vuelve a la vista de inventario pedida");

// 3. stock con código de color
await page.getByTestId("asset-row").first().waitFor();
const rows = await page.getByTestId("asset-row").count();
ok(rows >= 6, `la tabla muestra los activos con su stock (${rows} filas)`);
const levels = await page.locator("[data-testid=asset-row] [data-level]").evaluateAll((els) => els.map((e) => e.getAttribute("data-level")));
ok(levels.every((l) => ["empty", "low", "ok"].includes(l)) && levels.length === rows, `cada fila lleva su nivel de stock (${[...new Set(levels)].join(", ")})`);
const first = await page.locator("[data-testid=asset-row] [data-level]").first().getAttribute("data-level");
ok(first === levels.slice().sort((a, b) => ({ empty: 0, low: 1, ok: 2 })[a] - ({ empty: 0, low: 1, ok: 2 })[b])[0], "lo más urgente está arriba");

// 4. salida desde el enlace de una fila: el activo llega preseleccionado y su stock se ve antes de enviar
const row = page.getByTestId("asset-row").filter({ hasText: "NXV-IT-002" });
await row.getByRole("link", { name: /Registrar salida de/ }).click();
await page.waitForURL("**/inventory/orders/outbound?asset=*");
const available = await page.getByTestId("available-stock").textContent();
ok(/^\d+ unidad(es)?$/.test(available.trim()), `muestra el stock disponible antes de enviar (${available.trim()})`);
ok((await page.getByLabel("Activo").inputValue()) !== "", "el activo del enlace llega preseleccionado");
const stock = Number(available.trim().split(" ")[0]);

// 4b. más de lo que hay: avisa mientras se escribe, antes de enviar
let posts = 0;
await page.route("**/api/inventory/orders/outbound", async (route) => {
  posts++;
  await route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({ detail: `Insufficient stock for asset 'Portátil 14" Business'. Available: ${stock}, requested: ${stock + 1}.` }),
  });
});
await page.getByLabel("Asignado a").fill("Ana Pérez");
await page.getByLabel("Cantidad", { exact: true }).fill(String(stock + 1));
await page.getByTestId("quantity-warning").waitFor();
ok(posts === 0, "más unidades que el stock avisa en el formulario antes de enviar");

// 4c. la API lo rechaza con un 400: frase legible junto al campo de cantidad, nunca JSON
await page.getByRole("button", { name: "Registrar salida" }).click();
const inline = page.locator("#outbound-quantity-error");
await inline.waitFor();
const text = (await inline.textContent()).trim();
ok(posts === 1 && /No hay stock suficiente de «/.test(text) && !/[{}]|detail/.test(text), `el 400 se muestra junto a la cantidad: «${text}»`);

// 5. historial: solo lectura, con producto y autor
await page.getByRole("link", { name: "Historial de órdenes" }).click();
await page.waitForURL("**/inventory/orders");
await page.getByTestId("order-row").first().waitFor();
const orders = await page.getByTestId("order-row").count();
ok(orders >= 7, `el historial lista entradas y salidas (${orders})`);
const cells = await page.getByTestId("order-row").first().locator("td").allTextContents();
const uuid = await page.getByTestId("order-user-uuid").first().textContent();
ok(cells.length === 7 && cells[2].length > 3 && /^[0-9a-f-]{36}$/.test(uuid.trim()), `cada orden trae el activo y el user_uuid que la creó (${cells[2]} · ${uuid.trim()})`);
ok((await page.locator("main form, main input[type=number]").count()) === 0, "el historial no tiene formularios (solo lectura)");

// 6. entrada: el formulario carga los productos y valida
await page.getByRole("link", { name: "Entrada de activos" }).first().click();
await page.waitForURL("**/inventory/orders/inbound");
await page.getByRole("button", { name: "Registrar entrada" }).click();
await page.getByText("Selecciona el activo recibido.").waitFor();
ok((await page.getByText("Indica el proveedor.").count()) === 1, "la entrada pide activo, cantidad y proveedor");

ok(errors.length === 0, `sin errores en la consola${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(fails === 0 ? "\nTodo OK" : `\n${fails} comprobaciones fallaron`);
process.exit(fails === 0 ? 0 : 1);
